import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { excludeBlocked, fetchBlockedUserIds } from "@/hooks/useBlocks";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import type { TablesInsert } from "@/integrations/supabase/types";
import { compressImageFile, ITEM_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";

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
    is_sample?: boolean | null;
  } | null;
  is_liked_by_me?: boolean;
}

/** 写真を並び順にし、URL が空の行は落とす（文字だけの投稿と同じに扱う。真っ白な写真を出さない） */
export function sortImages(images: ItemPost["images"] | null | undefined): ItemPost["images"] {
  return (images || []).filter((img) => !!img.image_url).sort((a, b) => a.display_order - b.display_order);
}

/** 文字だけの投稿（写真なし） */
export const isTextOnlyPost = (post: Pick<ItemPost, "images">) => post.images.length === 0;

export type PostTarget =
  | { type: "official"; id: string }
  | { type: "user_item"; id: string };

/**
 * 指定グッズへの投稿一覧（新着順）。
 * authorId を渡すと、その人の投稿だけにする（グッズ詳細の「このグッズの投稿」で、持ち主の投稿だけを出すため）。
 */
export function useItemPosts(target: PostTarget | null, limit = 20, authorId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["item-posts", target?.type, target?.id, user?.id, authorId ?? null],
    queryFn: async (): Promise<ItemPost[]> => {
      if (!target) return [];

      const query = supabase
        .from("item_posts")
        .select(
          `
          *,
          images:item_post_images ( id, image_url, display_order ),
          profile:profiles ( id, username, display_name, avatar_url, is_sample )
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (target.type === "official") {
        query.eq("official_item_id", target.id);
      } else {
        query.eq("user_item_id", target.id);
      }
      if (authorId) query.eq("user_id", authorId);

      const { data, error } = await query;
      if (error) throw error;

      const blocked = await fetchBlockedUserIds(queryClient, user?.id);
      const posts = excludeBlocked((data || []) as any[], blocked, (p) => p.user_id);

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
        images: sortImages(p.images),
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
  const queryClient = useQueryClient();

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
          profile:profiles ( id, username, display_name, avatar_url, is_sample )
        `
        )
        .eq("id", postId)
        .single();
      if (error) throw error;

      // ブロック関係にある人の投稿は、リンクで開かれても見せない
      const blocked = await fetchBlockedUserIds(queryClient, user?.id);
      if (blocked.has((data as any).user_id)) return null;

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
        images: sortImages(data.images),
        is_liked_by_me,
      };
    },
    enabled: !!postId,
  });
}

/** 本文の上限。X より少し長め（グッズの説明も書けるように）。入力欄の maxLength と残りの輪に使う */
export const POST_CAPTION_MAX = 500;

/**
 * グッズなしの文字だけの投稿が、DB の制約（item_posts_target_check）で断られたとき。
 * 制約をゆるめるマイグレーション（20261029120000_item_posts_text_only）がまだ当たっていない環境で起きる。
 * 画面では赤いエラーではなく、ポッケの一言で「グッズを選んでね」と伝える
 */
export class TextPostNeedsGoodsError extends Error {
  constructor() {
    super("text post needs goods");
    this.name = "TextPostNeedsGoodsError";
  }
}

/**
 * 投稿作成 (画像アップロード + insert をまとめて)
 * 写真は任意（X のような文字だけの投稿）。写真がないときは本文が必須。グッズ（target）も任意。
 */
export function useCreateItemPost() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      target,
      caption,
      images,
    }: {
      target: PostTarget | null;
      caption?: string;
      images: File[];
    }) => {
      if (!user?.id) throw new Error("Not logged in");
      const text = caption?.trim() || null;
      if (images.length === 0 && !text) throw new Error(t("notices.itemPosts.textOrImageRequired"));
      if (text && text.length > POST_CAPTION_MAX) throw new Error(t("notices.itemPosts.captionTooLong", { max: POST_CAPTION_MAX }));

      // 1. 投稿行作成
      const insertPayload: TablesInsert<"item_posts"> = { user_id: user.id, caption: text };
      if (target?.type === "official") insertPayload.official_item_id = target.id;
      else if (target?.type === "user_item") insertPayload.user_item_id = target.id;

      const { data: post, error: postError } = await supabase
        .from("item_posts")
        .insert(insertPayload)
        .select()
        .single();
      // 23514 = CHECK 違反。グッズなしの投稿で、制約がまだ古いとき
      if (postError?.code === "23514" && !target) throw new TextPostNeedsGoodsError();
      if (postError) throw postError;
      if (images.length === 0) return post;

      // 2. 画像アップロード + レコード作成
      const imageRecords: { post_id: string; image_url: string; display_order: number }[] = [];
      for (let i = 0; i < images.length; i++) {
        // 投稿の写真はそのまま上げていたので、1〜2MB の PNG が並び、みんなの投稿の画面が重かった。
        // ほかの写真と同じく、上げる前に縮める（長辺 1600px の JPEG）。キャッシュも長くする（パスは毎回新しい）
        const file = await compressImageFile(images[i], ITEM_IMAGE_OPTIONS);
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${post.id}/${i}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("item-posts")
          .upload(path, file, { contentType: file.type, upsert: false, cacheControl: UPLOAD_CACHE_CONTROL });
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
      if (variables.target) qc.invalidateQueries({ queryKey: ["item-posts", variables.target.type, variables.target.id] });
      // 探索/フィードの一覧は別キー。ここを更新しないと、投稿してもフィードに出てこない。
      qc.invalidateQueries({ queryKey: ["item-posts-feed"] });
      qc.invalidateQueries({ queryKey: ["user-item-posts"] });
      toast.success(t("notices.itemPosts.created"));
    },
    onError: (e) => {
      if (e instanceof TextPostNeedsGoodsError) {
        pockeCheer("textPostNeedsGoods");
        return;
      }
      toast.error((e as Error).message || t("notices.itemPosts.createFailed"));
    },
  });
}

/**
 * 投稿削除
 */
export function useDeleteItemPost() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("item_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item-posts"] });
      qc.invalidateQueries({ queryKey: ["item-posts-feed"] });
      qc.invalidateQueries({ queryKey: ["user-item-posts"] });
      toast.success(t("notices.itemPosts.deleted"));
    },
    onError: () => toast.error(t("notices.itemPosts.deleteFailed")),
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
        images: sortImages(p.images),
      }));
    },
    enabled: !!userId,
  });
}
