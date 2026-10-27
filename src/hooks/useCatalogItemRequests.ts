import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  CatalogItemRequestKind,
  CatalogItemRequestStatus,
  DeleteReason,
  ProposedChange,
} from "@/utils/catalogItemRequests";

/** 申請の行（一覧で使う形。グッズの名前・画像を一緒に引く） */
export interface CatalogItemRequestRow {
  id: string;
  user_id: string;
  official_item_id: string;
  kind: CatalogItemRequestKind;
  reason: DeleteReason | null;
  note: string | null;
  proposed: ProposedChange | null;
  duplicate_of: string | null;
  status: CatalogItemRequestStatus;
  admin_note: string | null;
  handled_at: string | null;
  created_at: string;
  item: { id: string; title: string; image: string | null } | null;
  duplicate: { id: string; title: string; image: string | null } | null;
}

/** 管理画面で使う形（送った人の名前と、いまのグッズの値も引く） */
export interface AdminCatalogItemRequestRow extends Omit<CatalogItemRequestRow, "item"> {
  before_snapshot: Record<string, unknown> | null;
  requester: { username: string | null } | null;
  item: {
    id: string;
    title: string;
    image: string | null;
    content_name: string | null;
    release_date: string | null;
    price: string | null;
    exclude_from_lists: boolean;
    merged_into: string | null;
    item_tags: { tags: { id: string; name: string; category: string | null } | null }[];
  } | null;
}

export interface SubmitCatalogItemRequestInput {
  officialItemId: string;
  kind: CatalogItemRequestKind;
  reason?: DeleteReason | null;
  note?: string | null;
  proposed?: ProposedChange | null;
  duplicateOf?: string | null;
}

const MY_KEY = "my-catalog-item-requests";
const ADMIN_KEY = "admin-catalog-item-requests";

const ITEM_SELECT = `id, user_id, official_item_id, kind, reason, note, proposed, duplicate_of, status, admin_note, handled_at, created_at,
  item:official_items!catalog_item_requests_official_item_id_fkey(id, title, image),
  duplicate:official_items!catalog_item_requests_duplicate_of_fkey(id, title, image)`;

/** 削除申請・修正申請・重複の報告を送る（ログインしている人だけ。RLS で本人の user_id しか入らない） */
export function useSubmitCatalogItemRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitCatalogItemRequestInput) => {
      if (!user) throw new Error("not_signed_in");
      const note = input.note?.trim() ? input.note.trim().slice(0, 500) : null;
      const { error } = await supabase.from("catalog_item_requests").insert({
        user_id: user.id,
        official_item_id: input.officialItemId,
        kind: input.kind,
        reason: input.kind === "delete" ? input.reason ?? "other" : input.kind === "duplicate" ? "duplicate" : null,
        note,
        proposed: input.kind === "edit" ? ((input.proposed ?? {}) as never) : null,
        duplicate_of: input.kind === "duplicate" ? input.duplicateOf ?? null : null,
      });
      if (error) throw error;
    },
    // 失敗は呼び出し側がポッケの一言で伝える。ここで受けておき、全体の「通信に失敗しました」トーストを重ねない
    onError: () => {},
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [MY_KEY] });
    },
  });
}

/** 自分が送った申請（新しい順） */
export function useMyCatalogItemRequests(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [MY_KEY, user?.id],
    enabled: enabled && !!user,
    queryFn: async (): Promise<CatalogItemRequestRow[]> => {
      const { data, error } = await supabase
        .from("catalog_item_requests")
        .select(ITEM_SELECT)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as CatalogItemRequestRow[];
    },
  });
}

/** 確認待ちの申請を取り下げる（本人だけ） */
export function useWithdrawCatalogItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("withdraw_catalog_item_request", { _request_id: requestId });
      if (error) throw error;
    },
    // 失敗は呼び出し側がポッケの一言で伝える。ここで受けておき、全体の「通信に失敗しました」トーストを重ねない
    onError: () => {},
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [MY_KEY] });
    },
  });
}

/** 管理画面: 確認待ち（古い順・全件）と、確認済み（新しい順・直近だけ） */
export function useAdminCatalogItemRequests() {
  return useQuery({
    queryKey: [ADMIN_KEY],
    queryFn: async (): Promise<AdminCatalogItemRequestRow[]> => {
      const select = `id, user_id, official_item_id, kind, reason, note, proposed, duplicate_of, status, admin_note, handled_at, created_at, before_snapshot,
        requester:profiles!catalog_item_requests_user_profile_fkey(username),
        item:official_items!catalog_item_requests_official_item_id_fkey(id, title, image, content_name, release_date, price, exclude_from_lists, merged_into,
          item_tags(tags(id, name, category))),
        duplicate:official_items!catalog_item_requests_duplicate_of_fkey(id, title, image)`;
      const [pending, handled] = await Promise.all([
        supabase
          .from("catalog_item_requests")
          .select(select)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(200),
        supabase
          .from("catalog_item_requests")
          .select(select)
          .neq("status", "pending")
          .order("handled_at", { ascending: false, nullsFirst: false })
          .limit(30),
      ]);
      if (pending.error) throw pending.error;
      if (handled.error) throw handled.error;
      return [...(pending.data ?? []), ...(handled.data ?? [])] as unknown as AdminCatalogItemRequestRow[];
    },
  });
}

/** 管理画面: 確認待ちの件数（タブのバッジ） */
export function usePendingCatalogItemRequestCount() {
  return useQuery({
    queryKey: [ADMIN_KEY, "count"],
    staleTime: 1000 * 60,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("catalog_item_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** 管理画面: 承認（そのまま反映）・見送り */
export function useReviewCatalogItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; approve: boolean; adminNote?: string; keepReported?: boolean }) => {
      const { data, error } = await supabase.rpc("review_catalog_item_request", {
        _request_id: input.requestId,
        _approve: input.approve,
        _admin_note: input.adminNote?.trim() || undefined,
        _keep_reported: input.keepReported ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [ADMIN_KEY] }),
        // カタログの見た目が変わるので、グッズのページ・一覧も引き直す
        queryClient.invalidateQueries({ queryKey: ["public-item"] }),
        queryClient.invalidateQueries({ queryKey: ["item-tags"] }),
      ]);
    },
  });
}

/** 修正申請のフォームで使う: 作品の一覧（93件ほどなので全部引く） */
export function useContentNameOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["catalog-request-content-names"],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_names").select("id, name").order("name").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** 修正申請のフォームで使う: グッズタイプ（カテゴリ）の一覧 */
export function useTypeTagOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["catalog-request-type-tags"],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, usage_count")
        .eq("category", "type")
        .eq("status", "approved")
        .order("usage_count", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** 修正申請のフォームで使う: 作品ごとのキャラ */
export function useCharacterTagOptions(contentId: string | null | undefined) {
  return useQuery({
    queryKey: ["catalog-request-character-tags", contentId],
    enabled: !!contentId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, usage_count")
        .eq("category", "character")
        .eq("content_id", contentId!)
        .eq("status", "approved")
        .order("usage_count", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** タグの id → 名前（管理画面の差分・申請の状況で使う） */
export function useTagNames(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["catalog-request-tag-names", key],
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from("tags").select("id, name").in("id", ids);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((t) => [t.id, t.name]));
    },
  });
}
