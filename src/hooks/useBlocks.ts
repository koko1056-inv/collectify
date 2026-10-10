import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * ブロック。
 *
 * 「自分がブロックした人」と「自分をブロックした人」の両方を一覧から外す。
 * 後者を外さないと、相手からは見えないのにこちらからは見えてしまう。
 * 誰にブロックされたかは本人に見せない設計なので、ID だけを返す RPC を使う。
 */
export const blockedIdsKey = (userId: string | undefined) => ["blocked-user-ids", userId] as const;

const STALE_MS = 60_000;

async function rpcBlockedIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_blocked_user_ids");
  if (error) throw error;
  return (data ?? []) as string[];
}

/**
 * queryFn の中（フックを使えない場所）からブロック済み ID を取る。
 * 失敗しても一覧そのものは出したいので、空として扱う。
 */
export async function fetchBlockedUserIds(
  queryClient: QueryClient,
  userId: string | undefined | null
): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    const ids = await queryClient.fetchQuery({
      queryKey: blockedIdsKey(userId),
      queryFn: rpcBlockedIds,
      staleTime: STALE_MS,
    });
    return new Set(ids);
  } catch (e) {
    console.error("failed to load blocked user ids:", e);
    return new Set();
  }
}

/** 一覧から、ブロック関係にある人の行を除く。getOwner は行の持ち主の ID を返す。 */
export function excludeBlocked<T>(
  rows: T[],
  blocked: Set<string>,
  getOwner: (row: T) => string | null | undefined
): T[] {
  if (blocked.size === 0) return rows;
  return rows.filter((row) => {
    const owner = getOwner(row);
    return !owner || !blocked.has(owner);
  });
}

/**
 * PostgREST の `.not("id", "in", ...)` に渡す値（"(a,b,c)"）。ブロック関係の人がいなければ null。
 * limit 付きの一覧では、取得後に除くと件数が減ってしまうので、クエリ側で外すのに使う。
 */
export function toNotInList(blocked: Set<string>): string | null {
  if (blocked.size === 0) return null;
  return `(${[...blocked].join(",")})`;
}

/** コンポーネントから使う。ids はブロック関係にある全ユーザーの ID。 */
export function useBlockedUserIds() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: blockedIdsKey(user?.id),
    queryFn: rpcBlockedIds,
    enabled: !!user?.id,
    staleTime: STALE_MS,
  });

  const ids = useMemo(() => new Set(query.data ?? []), [query.data]);
  const isBlocked = useCallback((id: string | null | undefined) => !!id && ids.has(id), [ids]);
  const filter = useCallback(
    <T,>(rows: T[], getOwner: (row: T) => string | null | undefined) => excludeBlocked(rows, ids, getOwner),
    [ids]
  );

  return { ids, isBlocked, filter, isLoading: query.isLoading };
}

export interface BlockedUser {
  blocked_id: string;
  created_at: string;
  profile: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

/** 設定画面用: 自分がブロックした人の一覧（プロフィール付き）。 */
export function useBlockedUsers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["blocked-users", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id, created_at, profile:profiles!user_blocks_blocked_id_fkey(username, display_name, avatar_url)")
        .eq("blocker_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BlockedUser[];
    },
  });
}

/** ブロック・解除の後は、投稿・コメント・メッセージなどの一覧をまとめて取り直す。 */
function refreshAfterBlockChange(queryClient: QueryClient) {
  // 一覧系のキャッシュが多岐にわたるため、ブロックという稀な操作に限って全体を無効化する
  return queryClient.invalidateQueries();
}

export function useBlockUser() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string; name?: string }) => {
      if (!user?.id) throw new Error("login required");
      const { error } = await supabase
        .from("user_blocks")
        .insert({ blocker_id: user.id, blocked_id: userId });
      // すでにブロック済みなら成功として扱う
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: async (_data, vars) => {
      toast.success(t("safety.menu.blocked"), {
        description: t("safety.menu.blockedDesc", { name: vars.name || t("safety.blocked.anonymous") }),
      });
      await refreshAfterBlockChange(queryClient);
    },
    onError: (e) => {
      console.error("failed to block user:", e);
      toast.error(t("safety.menu.blockFailed"));
    },
  });
}

export function useUnblockUser() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!user?.id) throw new Error("login required");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("safety.menu.unblocked"));
      await refreshAfterBlockChange(queryClient);
    },
    onError: (e) => {
      console.error("failed to unblock user:", e);
      toast.error(t("safety.menu.unblockFailed"));
    },
  });
}
