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
  /** 参加したお題イベント（post_events）。参加していなければ null */
  event_id?: string | null;
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
        .maybeSingle();
      if (error) throw error;
      // 削除された投稿（共有リンク・ひらいたままの詳細）はエラーにせず「見つからない」として出す
      if (!data) return null;

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
      eventId,
    }: {
      target: PostTarget | null;
      caption?: string;
      images: File[];
      /** お題イベントのページから投稿したとき。サーバーが公開中・期間内かを確かめる */
      eventId?: string | null;
    }) => {
      if (!user?.id) throw new Error("Not logged in");
      const text = caption?.trim() || null;
      if (images.length === 0 && !text) throw new Error(t("notices.itemPosts.textOrImageRequired"));
      if (text && text.length > POST_CAPTION_MAX) throw new Error(t("notices.itemPosts.captionTooLong", { max: POST_CAPTION_MAX }));

      // 1. 投稿行作成
      const insertPayload: TablesInsert<"item_posts"> = { user_id: user.id, caption: text };
      if (target?.type === "official") insertPayload.official_item_id = target.id;
      else if (target?.type === "user_item") insertPayload.user_item_id = target.id;
      if (eventId) insertPayload.event_id = eventId;

      let { data: post, error: postError } = await supabase
        .from("item_posts")
        .insert(insertPayload)
        .select()
        .single();
      // 開いている間にお題が締め切られた（22023）ときは、投稿そのものは失わずにふつうの投稿として出す
      if (postError?.code === "22023" && eventId) {
        delete insertPayload.event_id;
        ({ data: post, error: postError } = await supabase.from("item_posts").insert(insertPayload).select().single());
        if (!postError) toast.info(t("postEvents.closedError"));
      }
      // 23514 = CHECK 違反。グッズなしの投稿で、制約がまだ古いとき
      if (postError?.code === "23514" && !target) throw new TextPostNeedsGoodsError();
      if (postError || !post) throw postError ?? new Error("insert failed");
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
      qc.invalidateQueries({ queryKey: ["post-event-stats"] });
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
  const { user } = useAuth();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (postId: string) => {
      // 写真のパスは先に控える（投稿の行を消すと item_post_images も一緒に消える）
      const { data: imgs } = await supabase.from("item_post_images").select("image_url").eq("post_id", postId);

      // RLS で止められた削除はエラーにならず 0 行で返る。消えた行を返してもらい、0 行なら失敗として知らせる
      // （以前は 0 行でも「削除しました」と出していた）
      const { data, error } = await supabase.from("item_posts").delete().eq("id", postId).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new PostDeleteNotAllowedError();

      // 写真の後片付け。自分のフォルダ（item-posts/<自分の id>/）の写真だけ。
      // AI ルームの投稿など、ほかのバケットの写真は持ち主が別に使っているので消さない。
      // 失敗しても投稿の削除は済んでいるので、待たない・止めない・知らせない
      const paths = (imgs || [])
        .map((img) => itemPostsStoragePath(img.image_url))
        .filter((p): p is string => !!p && !!user?.id && p.startsWith(`${user.id}/`));
      if (paths.length > 0) {
        void supabase.storage
          .from("item-posts")
          .remove(paths)
          .then(
            ({ error: rmErr }) => rmErr && console.warn("投稿の写真を消せませんでした:", rmErr.message),
            (e) => console.warn("投稿の写真を消せませんでした:", e)
          );
      }
    },
    // 0 行（消す権限がない）は何度やっても同じなので、通信の失敗のときだけ 1 回やり直す
    retry: (count, e) => !(e instanceof PostDeleteNotAllowedError) && count < 1,
    // 押したらすぐ一覧から消す（フィードの全ページを読み直すまで、消した投稿が残って見えないように）
    onMutate: async (postId) => {
      await Promise.all(POST_LIST_KEYS.map((queryKey) => qc.cancelQueries({ queryKey })));
      const snapshot = POST_LIST_KEYS.flatMap((queryKey) => qc.getQueriesData({ queryKey }));
      snapshot.forEach(([key, data]) => qc.setQueryData<unknown>(key, withoutPost(data, postId)));
      return { snapshot };
    },
    onSuccess: (_data, postId) => {
      // ひらいたままの詳細・/post/:id は「見つからない（削除された）」にする
      qc.setQueriesData({ queryKey: ["item-post", postId] }, null);
      toast.success(t("notices.itemPosts.deleted"));
    },
    onError: (e, _postId, ctx) => {
      // 一覧を元に戻す（消えていないのに消えたように見せない）
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData<unknown>(key, data));
      toast.error(
        t(e instanceof PostDeleteNotAllowedError ? "notices.itemPosts.deleteNotAllowed" : "notices.itemPosts.deleteFailed")
      );
    },
    onSettled: () => {
      POST_LIST_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      // プロフィールの「投稿」の数
      qc.invalidateQueries({ queryKey: ["profile-hero-stats"] });
    },
  });
}

/** 削除が 0 行だった（RLS で止められた）。自分の投稿ではない・ログインが切れている など */
export class PostDeleteNotAllowedError extends Error {
  constructor() {
    super("post delete was not allowed");
    this.name = "PostDeleteNotAllowedError";
  }
}

/** 投稿が並ぶ一覧のキー（グッズの投稿・フィード・みんなの先頭・プロフィール） */
const POST_LIST_KEYS = [["item-posts"], ["item-posts-feed"], ["user-item-posts"]];

/** キャッシュの一覧（配列・SNS 風フィードの { pages: [{ posts }] }）から、その投稿を抜く */
function withoutPost(old: unknown, postId: string): unknown {
  if (!old || typeof old !== "object") return old;
  if (Array.isArray(old)) return old.filter((p: { id?: string } | null) => p?.id !== postId);
  const o = old as { pages?: unknown[] };
  if (!Array.isArray(o.pages)) return old;
  return {
    ...o,
    pages: o.pages.map((pg) => {
      const page = pg as { posts?: unknown } | null;
      return page && Array.isArray(page.posts) ? { ...page, posts: withoutPost(page.posts, postId) } : pg;
    }),
  };
}

const ITEM_POSTS_PUBLIC_PREFIX = "/storage/v1/object/public/item-posts/";
/** item-posts バケットの公開 URL から、バケットの中のパスを取り出す（ほかのバケットの写真は null） */
function itemPostsStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(ITEM_POSTS_PUBLIC_PREFIX);
  if (i < 0) return null;
  const path = url.slice(i + ITEM_POSTS_PUBLIC_PREFIX.length).split("?")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
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
