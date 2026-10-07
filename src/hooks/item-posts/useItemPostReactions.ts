import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export type ReactionKind = "have" | "want" | "love";
export const REACTION_KINDS: ReactionKind[] = ["have", "want", "love"];

export interface PostReactionSummary {
  counts: Record<ReactionKind, number>;
  mine: Set<ReactionKind>;
}

const empty = (): PostReactionSummary => ({
  counts: { have: 0, want: 0, love: 0 },
  mine: new Set(),
});

/**
 * 複数の投稿ぶんの反応をまとめて1回で取得する（一覧の各タイルで個別に問い合わせない）。
 */
export function useItemPostReactions(postIds: string[]) {
  const { user } = useAuth();
  const key = [...postIds].sort().join(",");

  const query = useQuery({
    queryKey: ["item-post-reactions", key, user?.id],
    queryFn: async () => {
      const map = new Map<string, PostReactionSummary>();
      if (postIds.length === 0) return map;
      const { data, error } = await supabase
        .from("item_post_reactions")
        .select("post_id, user_id, kind")
        .in("post_id", postIds);
      if (error) throw error;
      for (const row of data ?? []) {
        const kind = row.kind as ReactionKind;
        if (!REACTION_KINDS.includes(kind)) continue;
        const s = map.get(row.post_id) ?? empty();
        s.counts[kind] += 1;
        if (user?.id && row.user_id === user.id) s.mine.add(kind);
        map.set(row.post_id, s);
      }
      return map;
    },
    enabled: postIds.length > 0,
    staleTime: 1000 * 30,
  });

  const get = (postId: string): PostReactionSummary => query.data?.get(postId) ?? empty();
  return { ...query, get };
}

export function useToggleReaction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      postId,
      kind,
      active,
    }: {
      postId: string;
      kind: ReactionKind;
      active: boolean;
    }) => {
      if (!user?.id) throw new Error(t("notices.common.loginRequired"));
      if (active) {
        const { error } = await supabase
          .from("item_post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("kind", kind);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("item_post_reactions")
          .insert({ post_id: postId, user_id: user.id, kind });
        if (error && error.code !== "23505") throw error;
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["item-post-reactions"] });
    },
    onError: (e) => toast.error((e as Error).message || t("engage.posts.reactFailed")),
  });
}
