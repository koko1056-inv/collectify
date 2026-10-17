import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addToCollection, copyOfficialItemTags, incrementItemQuantity } from "@/utils/collection-actions";
import { invalidateCollectionChanged } from "@/utils/collection-cache";
import { todayJst } from "@/utils/companion";
import { isDue, type PreorderLike } from "@/utils/preorders";
import { pockeCheer } from "@/components/pocke/pockeCheer";

/**
 * 「予約中」のグッズ（preorders テーブル。本人だけが読み書きする）。
 *
 * ほしい → 予約した → 持ってる の真ん中。予約すると「ほしいもの」から外し、
 * 届いたら（receive）コレクションに入れてから、この行を消す。
 * コレクションへの入れ方は、ほかの追加と同じ（上限の確認・タグの写し・登録のポイントはサーバー）。
 */

export interface Preorder extends PreorderLike {
  officialItemId: string;
  shop: string | null;
  createdAt: string;
  title: string;
  image: string;
  contentName: string | null;
  /** カタログの値段の表記（例: "¥1,650"） */
  catalogPrice: string | null;
}

export interface PreorderInput {
  officialItemId: string;
  quantity: number;
  price: number | null;
  shop: string | null;
}

export interface ReceiveResult {
  ok: boolean;
  /** 持っていて所持数を増やしたとき、増やしたあとの数 */
  quantity?: number;
  atLimit?: boolean;
  maxSlots?: number;
}

export const preordersKey = (userId: string | null | undefined) => ["preorders", userId] as const;

interface Row {
  id: string;
  official_item_id: string;
  quantity: number;
  price: number | null;
  shop: string | null;
  created_at: string;
  official_items: {
    title: string;
    image: string;
    price: string | null;
    release_date: string | null;
    content_name: string | null;
  } | null;
}

async function fetchPreorders(userId: string): Promise<Preorder[]> {
  const { data, error } = await supabase
    .from("preorders")
    .select("id, official_item_id, quantity, price, shop, created_at, official_items(title, image, price, release_date, content_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    officialItemId: r.official_item_id,
    quantity: r.quantity,
    price: r.price,
    shop: r.shop,
    createdAt: r.created_at,
    title: r.official_items?.title ?? "",
    image: r.official_items?.image ?? "",
    contentName: r.official_items?.content_name ?? null,
    catalogPrice: r.official_items?.price ?? null,
    releaseDate: r.official_items?.release_date ?? null,
  }));
}

async function invalidatePreorders(queryClient: QueryClient, userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: preordersKey(userId) }),
    // 予約すると「ほしいもの」から外すので、ほしいものの表示も引き直す
    queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    queryClient.invalidateQueries({ queryKey: ["wished-official-item-ids", userId] }),
    queryClient.invalidateQueries({ queryKey: ["my-wish-ids", userId] }),
    queryClient.invalidateQueries({ queryKey: ["wishlist-counts"] }),
    queryClient.invalidateQueries({ queryKey: ["public-item-state", userId] }),
  ]);
}

export function usePreorders() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: preordersKey(userId),
    enabled: !!userId,
    queryFn: () => fetchPreorders(userId as string),
    staleTime: 1000 * 60 * 2,
  });
  const preorders = useMemo(() => query.data ?? [], [query.data]);
  const byItem = useMemo(() => new Map(preorders.map((p) => [p.officialItemId, p])), [preorders]);
  const today = todayJst();
  const due = useMemo(() => preorders.filter((p) => isDue(p, today)), [preorders, today]);

  /** 予約する・予約の内容を直す（同じグッズは1行） */
  const save = useCallback(
    async (input: PreorderInput) => {
      if (!userId) throw new Error("not signed in");
      const existing = byItem.get(input.officialItemId);
      const fields = { quantity: input.quantity, price: input.price, shop: input.shop?.trim() || null };
      if (existing) {
        const { error } = await supabase.from("preorders").update(fields).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("preorders").insert({ user_id: userId, official_item_id: input.officialItemId, ...fields });
        // 別の画面で先に予約していた（一意制約）ときは、内容を直す
        if (error?.code === "23505") {
          const { error: upErr } = await supabase
            .from("preorders")
            .update(fields)
            .eq("user_id", userId)
            .eq("official_item_id", input.officialItemId);
          if (upErr) throw upErr;
        } else if (error) {
          throw error;
        }
        // 予約したら「ほしい」は済んだので外す（ほしい → 予約した）
        await supabase.from("wishlists").delete().eq("user_id", userId).eq("official_item_id", input.officialItemId);
      }
      await invalidatePreorders(queryClient, userId);
    },
    [userId, byItem, queryClient]
  );

  const cancel = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { error } = await supabase.from("preorders").delete().eq("id", id);
      if (error) throw error;
      await invalidatePreorders(queryClient, userId);
    },
    [userId, queryClient]
  );

  /** 届いた: コレクションに入れて（持っていれば所持数を増やして）から、予約を消す */
  const receive = useCallback(
    async (p: Preorder): Promise<ReceiveResult> => {
      if (!userId) return { ok: false };
      const { count } = await supabase
        .from("user_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("official_item_id", p.officialItemId);

      let quantity: number | undefined;
      if (count && count > 0) {
        const res = await incrementItemQuantity(userId, p.officialItemId, p.quantity);
        if (!res.success) return { ok: false };
        quantity = res.quantity;
      } else {
        const res = await addToCollection({
          userId,
          title: p.title,
          image: p.image,
          officialItemId: p.officialItemId,
          releaseDate: p.releaseDate ?? "",
          prize: p.catalogPrice || "0",
          quantity: p.quantity,
        });
        if (!res.success) return { ok: false, atLimit: res.isAtLimit, maxSlots: res.maxSlots };
        if (res.userItemId) {
          await copyOfficialItemTags(res.userItemId, p.officialItemId);
          // 買った値段と届いた日を残す（予約のときに入れた値段。合計額は1個あたり×個数ではなく1個の値段を入れる）
          await supabase
            .from("user_items")
            .update({ purchase_price: p.price != null ? String(p.price) : null, purchase_date: todayJst() })
            .eq("id", res.userItemId);
        }
      }

      const { error } = await supabase.from("preorders").delete().eq("id", p.id);
      if (error) console.error("[usePreorders] delete after receive failed:", error);
      await Promise.all([
        invalidatePreorders(queryClient, userId),
        invalidateCollectionChanged(queryClient, { userId, officialItemId: p.officialItemId }),
        queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" }),
      ]);
      pockeCheer("arrived");
      return { ok: true, quantity };
    },
    [userId, queryClient]
  );

  return {
    preorders,
    due,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    get: (officialItemId: string) => byItem.get(officialItemId),
    save,
    cancel,
    receive,
    canUse: !!userId,
  };
}
