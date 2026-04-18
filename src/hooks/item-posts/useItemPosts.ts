import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ItemPost {
  id: string;
  user_id: string;
  official_item_id: string | null;
  user_item_id: string | null;
  caption: string | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  images: { id: string; image_url: string; display_order: number }[];
  profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  is_liked_by_me?: boolean;
}

export type PostTarget =
  | { type: "official"; id: string }
  | { type: "user_item"; id: string };

/**
 * 指定グッズへの投稿一覧（新着順）。
 */
export function useItemPosts(target: PostTarget | null, limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["item-posts", target?.type, target?.id, user?.id],
    queryFn: async (): Promise<ItemPost[]> => {
      if (!target) return [];

      const query = supabase
        .from("item_posts")
        .select(
          `
          *,
          images:item_post_images ( id, image_url, display_order ),
          profile:profiles ( id, username, display_name, avatar_url )
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (target.type === "official") {
        query.eq("official_item_id", target.id);
      } else {
        query.eq("user_item_id", target.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const posts = (data || []) as any[];

      // 自分のいいね状態を一括取得
      let likedIds = new Set<string>();
      if (user?.id && posts.length > 0) {
        const { data: likes } = await supabase
          .from("item_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in(
            "post_id",
            posts.map((p) => p.id)
          );
        likedIds = new Set((likes || []).map((l) => l.post_id));
      }

      return posts.map((p) => ({
        ...p,
        images: (p.images || []).sort(
          (a: any, b: any) => a.display_order - b.display_order
        ),
        is_liked_by_me: likedIds.has(p.id),
      }));
    },
    enabled: !!target,
  });
}

/**
 * 投稿詳細取得 (1件)
 */
export function useItemPost(postId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["item-post", postId, user?.id],
    queryFn: async (): Promise<ItemPost | null> => {
      if (!postId) return null;
      const { data, error } = await supabase
        .from("item_posts")
        .select(
          `
          *,
          images:item_post_images ( id, image_url, display_order ),
          profile:profiles ( id, username, display_name, avatar_url )
        `
        )
        .eq("id", postId)
        .single();
      if (error) throw error;

      let is_liked_by_me = false;
      if (user?.id) {
        const { data: like } = await supabase
          .from("item_post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        is_liked_by_me = !!like;
      }

      return {
        ...(data as any),
        images: (data.images || []).sort(
          (a: any, b: any) => a.display_order - b.display_order
        ),
        is_liked_by_me,
      };
    },
    enabled: !!postId,
  });
}

/**
 * 投稿作成 (画像アップロード + insert をまとめて)
 */
export function useCreateItemPost() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      target,
      caption,
      images,
    }: {
      target: PostTarget;
      caption?: string;
      images: File[];
    }) => {
      if (!user?.id) throw new Error("Not logged in");
      if (images.length === 0) throw new Error("画像を1枚以上選択してください");

      // 1. 投稿行作成
      const insertPayload: any = {
        user_id: user.id,
        caption: caption?.trim() || null,
      };
      if (target.type === "official") insertPayload.official_item_id = target.id;
      else insertPayload.user_item_id = target.id;

      const { data: post, error: postError } = await supabase
        .from("item_posts")
        .insert(insertPayload)
        .select()
        .single();
      if (postError) throw postError;

      // 2. 画像アップロード + レコード作成
      const imageRecords: { post_id: string; image_url: string; display_order: number }[] = [];
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${post.id}/${i}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("item-posts")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("item-posts").getPublicUrl(path);
        imageRecords.push({ post_id: post.id, image_url: pub.publicUrl, display_order: i });
      }

      const { error: imgErr } = await supabase
        .from("item_post_images")
        .insert(imageRecords);
      if (imgErr) throw imgErr;

      return post;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["item-posts", variables.target.type, variables.target.id] });
      qc.invalidateQueries({ queryKey: ["user-item-posts"] });
      toast.success("投稿しました！");
    },
    onError: (e) => toast.error((e as Error).message || "投稿に失敗しました"),
  });
}

/**
 * 投稿削除
 */
export function useDeleteItemPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("item_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item-posts"] });
      qc.invalidateQueries({ queryKey: ["user-item-posts"] });
      toast.success("投稿を削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });
}

/**
 * 指定ユーザーの投稿一覧（プロフィール表示用）
 */
export function useUserItemPosts(userId: string | undefined | null, limit = 30) {
  return useQuery({
    queryKey: ["user-item-posts", userId],
    queryFn: async (): Promise<ItemPost[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("item_posts")
        .select(
          `
          *,
          images:item_post_images ( id, image_url, display_order )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        images: (p.images || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
    },
    enabled: !!userId,
  });
}
