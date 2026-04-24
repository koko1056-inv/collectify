import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { CommentReaction, ItemCommentNode } from "./types";

const KEY = (id: string) => ["item-comments", id] as const;

/**
 * official_item_id に紐づくコメント一覧を取得し、2階層ツリーに整形して返す。
 */
export function useItemComments(officialItemId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: KEY(officialItemId ?? ""),
    enabled: !!officialItemId,
    queryFn: async (): Promise<ItemCommentNode[]> => {
      const { data: rows, error } = await supabase
        .from("item_comments")
        .select(
          `id, official_item_id, user_id, parent_id, content, helpful_count, created_at, updated_at,
           profiles:profiles!item_comments_user_id_fkey ( id, username, display_name, avatar_url )`
        )
        .eq("official_item_id", officialItemId!)
        .order("created_at", { ascending: true });

      if (error) {
        // FK名が違う場合のフォールバック（プロフィールを別取得）
        const { data: simple, error: e2 } = await supabase
          .from("item_comments")
          .select("*")
          .eq("official_item_id", officialItemId!)
          .order("created_at", { ascending: true });
        if (e2) throw e2;
        const ids = Array.from(new Set((simple ?? []).map((r) => r.user_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
        const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
        const merged = (simple ?? []).map((r) => ({
          ...r,
          profiles: pmap.get(r.user_id) ?? null,
        })) as any[];
        return await attachReactions(merged, user?.id);
      }

      return await attachReactions(rows as any[], user?.id);
    },
  });
}

async function attachReactions(rows: any[], myUserId?: string): Promise<ItemCommentNode[]> {
  if (!rows.length) return [];

  let myReactions = new Map<string, CommentReaction>();
  if (myUserId) {
    const ids = rows.map((r) => r.id);
    const { data: reacts } = await supabase
      .from("item_comment_reactions")
      .select("comment_id, reaction")
      .eq("user_id", myUserId)
      .in("comment_id", ids);
    (reacts ?? []).forEach((r: any) => {
      myReactions.set(r.comment_id, r.reaction as CommentReaction);
    });
  }

  const map = new Map<string, ItemCommentNode>();
  rows.forEach((r) => {
    map.set(r.id, { ...r, myReaction: myReactions.get(r.id) ?? null, replies: [] });
  });
  const roots: ItemCommentNode[] = [];
  rows.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  });
  // 新しい順
  return roots.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function useCreateItemComment(officialItemId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      content,
      parentId,
    }: {
      content: string;
      parentId?: string | null;
    }) => {
      if (!user) throw new Error("ログインが必要です");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("内容を入力してください");
      if (trimmed.length > 1000) throw new Error("1000文字以内で入力してください");

      const { error } = await supabase.from("item_comments").insert({
        official_item_id: officialItemId,
        user_id: user.id,
        parent_id: parentId ?? null,
        content: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(officialItemId) });
    },
    onError: (e: any) => {
      toast({
        title: "投稿に失敗しました",
        description: e?.message ?? "しばらくしてから再度お試しください",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteItemComment(officialItemId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("item_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(officialItemId) });
      toast({ title: "コメントを削除しました" });
    },
    onError: (e: any) => {
      toast({ title: "削除に失敗しました", description: e?.message, variant: "destructive" });
    },
  });
}

export function useToggleCommentReaction(officialItemId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      reaction,
      currentlyOn,
    }: {
      commentId: string;
      reaction: CommentReaction;
      currentlyOn: boolean;
    }) => {
      if (!user) throw new Error("ログインが必要です");
      if (currentlyOn) {
        const { error } = await supabase
          .from("item_comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .eq("reaction", reaction);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("item_comment_reactions").insert({
          comment_id: commentId,
          user_id: user.id,
          reaction,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(officialItemId) });
    },
    onError: (e: any) => {
      toast({
        title: "リアクションに失敗しました",
        description: e?.message,
        variant: "destructive",
      });
    },
  });
}
