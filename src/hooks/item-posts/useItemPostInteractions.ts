import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ItemPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * いいねトグル (楽観的更新)
 */
export function useToggleItemPostLike() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, currentlyLiked }: { postId: string; currentlyLiked: boolean }) => {
      if (!user?.id) throw new Error("ログインが必要です");
      if (currentlyLiked) {
        const { error } = await supabase
          .from("item_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("item_post_likes")
          .insert({ post_id: postId, user_id: user.id });
        if (error && error.code !== "23505") throw error; // 重複は無視
      }
      return { postId, newLiked: !currentlyLiked };
    },
    onMutate: async ({ postId, currentlyLiked }) => {
      // 楽観的: キャッシュ上の like_count と is_liked_by_me を即更新
      await qc.cancelQueries({ queryKey: ["item-posts"] });
      const updateFn = (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((p: any) =>
            p.id === postId
              ? {
                  ...p,
                  is_liked_by_me: !currentlyLiked,
                  like_count: p.like_count + (currentlyLiked ? -1 : 1),
                }
              : p
          );
        }
        if (old.id === postId) {
          return {
            ...old,
            is_liked_by_me: !currentlyLiked,
            like_count: old.like_count + (currentlyLiked ? -1 : 1),
          };
        }
        return old;
      };
      qc.getQueriesData({ queryKey: ["item-posts"] }).forEach(([key, data]) => {
        qc.setQueryData(key, updateFn(data));
      });
      qc.getQueriesData({ queryKey: ["item-post"] }).forEach(([key, data]) => {
        qc.setQueryData(key, updateFn(data));
      });
    },
    onError: (err) => {
      toast.error((err as Error).message || "いいねに失敗しました");
      qc.invalidateQueries({ queryKey: ["item-posts"] });
      qc.invalidateQueries({ queryKey: ["item-post"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["item-posts"] });
      qc.invalidateQueries({ queryKey: ["item-post"] });
    },
  });
}

/**
 * 投稿のコメント一覧
 */
export function useItemPostComments(postId: string | null) {
  return useQuery({
    queryKey: ["item-post-comments", postId],
    queryFn: async (): Promise<ItemPostComment[]> => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from("item_post_comments")
        .select(
          `
          *,
          profile:profiles ( id, username, display_name, avatar_url )
        `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!postId,
  });
}

/**
 * コメント投稿
 */
export function useCreateItemPostComment() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user?.id) throw new Error("ログインが必要です");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("コメントを入力してください");
      const { data, error } = await supabase
        .from("item_post_comments")
        .insert({ post_id: postId, user_id: user.id, content: trimmed })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["item-post-comments", variables.postId] });
      qc.invalidateQueries({ queryKey: ["item-posts"] });
      qc.invalidateQueries({ queryKey: ["item-post"] });
    },
    onError: (e) => toast.error((e as Error).message || "コメントに失敗しました"),
  });
}

/**
 * コメント削除
 */
export function useDeleteItemPostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      const { error } = await supabase
        .from("item_post_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["item-post-comments", variables.postId] });
      qc.invalidateQueries({ queryKey: ["item-posts"] });
    },
  });
}
