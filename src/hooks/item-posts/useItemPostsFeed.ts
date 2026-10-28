import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ItemPost } from "./useItemPosts";
import type { ItemPostComment } from "./useItemPostInteractions";
import { excludeBlocked, fetchBlockedUserIds } from "@/hooks/useBlocks";

export type FeedMode = "new" | "popular" | "following";

/** フィードのカードに出すコメントの数（新しい方から） */
export const FEED_PREVIEW_COMMENTS = 2;
/** SNS 風フィードの 1 ページの件数 */
export const FEED_PAGE_SIZE = 12;

/** フィードのカード 1 枚ぶん。投稿に、カードの下に出す最新コメント（古い順）を添えたもの */
export interface FeedPost extends ItemPost {
  preview_comments: ItemPostComment[];
}

/**
 * keyset（前のページの最後の 1 件の次から）のカーソル。並びに使う列 + id（同じ時刻の投稿でも順序が決まるように）。
 * popular のときだけ like_count も使う。
 */
export interface FeedCursor {
  created_at: string;
  id: string;
  like_count?: number;
}

export interface FeedPage {
  posts: FeedPost[];
  /** 次のページのカーソル。null なら終わり */
  next: FeedCursor | null;
}

type FeedArgs = {
  mode: FeedMode;
  contentFilter?: string | null;
  hashtag?: string | null;
  userId?: string | null;
  limit: number;
  /** 指定するとその次から読む（keyset）。null/undefined は先頭 */
  after?: FeedCursor | null;
  /** カードの下に出す最新コメントも一緒に読む */
  withComments?: boolean;
};

// PostgREST の or() の値はダブルクォートで囲む（タイムスタンプの「:」「+」をそのまま渡せるように）
const q = (v: string | number) => `"${String(v).replace(/"/g, '\\"')}"`;

/**
 * フィードを 1 ページ読む。カード 1 枚ごとに問い合わせない（N+1 にしない）:
 *  - 投稿・画像・投稿者 … 1 回（埋め込み）。いいね数・コメント数は item_posts の集計列
 *  - 自分のいいね … ページの投稿 id で 1 回（in）
 *  - 最新コメント … ページの投稿 id で 1 回（in + 新しい順）。手元で投稿ごとに分けて、新しい方から 2 件
 */
async function fetchFeedPage(queryClient: QueryClient, args: FeedArgs): Promise<FeedPage> {
  const { mode, contentFilter, hashtag, userId, limit, after, withComments } = args;
  let query = supabase
    .from("item_posts")
    .select(
      `
      *,
      images:item_post_images ( id, image_url, display_order ),
      profile:profiles ( id, username, display_name, avatar_url, is_sample )
    `
    )
    .limit(limit);

  // モード別ソート/フィルター（最後に id を入れて全順序にする: keyset の境目で抜け・重複が出ないように）
  if (mode === "popular") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    query = query
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (after) {
      const lc = after.like_count ?? 0;
      query = query.or(
        `like_count.lt.${lc},and(like_count.eq.${lc},created_at.lt.${q(after.created_at)}),and(like_count.eq.${lc},created_at.eq.${q(after.created_at)},id.lt.${q(after.id)})`
      );
    }
  } else {
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
    if (after) {
      query = query.or(
        `created_at.lt.${q(after.created_at)},and(created_at.eq.${q(after.created_at)},id.lt.${q(after.id)})`
      );
    }
  }

  // following モード
  if (mode === "following" && userId) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    const ids = (follows || []).map((f) => f.following_id);
    if (ids.length === 0) return { posts: [], next: null };
    query = query.in("user_id", ids);
  }

  // ハッシュタグ検索
  if (hashtag) {
    query = query.ilike("caption", `%#${hashtag}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  // 埋め込みの画像は URL が空のことがある・並びが不定なので、下で整える
  const raw = (data || []) as unknown as ItemPost[];
  // 次のカーソルは絞り込み（ブロック・作品・写真なし）の前の最後の行から作る。絞り込んで 0 件のページがあっても先へ進めるように
  const last = raw[raw.length - 1];
  const next: FeedCursor | null =
    raw.length === limit && last ? { created_at: last.created_at, id: last.id, like_count: last.like_count } : null;

  // ブロックした人・ブロックされた人の投稿は並べない
  const blocked = await fetchBlockedUserIds(queryClient, userId);
  let posts = excludeBlocked(raw, blocked, (p) => p.user_id);

  // コンテンツ名フィルタ（official_items or user_items 経由で filter）
  if (contentFilter) {
    const officialIds = posts
      .map((p) => p.official_item_id)
      .filter(Boolean) as string[];
    const userItemIds = posts
      .map((p) => p.user_item_id)
      .filter(Boolean) as string[];

    const [officialRes, userRes] = await Promise.all([
      officialIds.length
        ? supabase
            .from("official_items")
            .select("id, content_name")
            .in("id", officialIds)
            .eq("content_name", contentFilter)
        : Promise.resolve({ data: [] as { id: string }[] }),
      userItemIds.length
        ? supabase
            .from("user_items")
            .select("id, content_name")
            .in("id", userItemIds)
            .eq("content_name", contentFilter)
        : Promise.resolve({ data: [] as { id: string }[] }),
    ]);
    const matchingOfficial = new Set((officialRes.data ?? []).map((r) => r.id));
    const matchingUser = new Set((userRes.data ?? []).map((r) => r.id));
    posts = posts.filter(
      (p) =>
        (p.official_item_id && matchingOfficial.has(p.official_item_id)) ||
        (p.user_item_id && matchingUser.has(p.user_item_id))
    );
  }

  // 画像のURLが空の投稿は、一覧で真っ白なカードになる。写真のない投稿は並べない
  posts = posts
    .map((p) => ({
      ...p,
      images: (p.images || [])
        .filter((img) => !!img.image_url)
        .sort((a, b) => a.display_order - b.display_order),
    }))
    .filter((p) => p.images.length > 0);

  const ids = posts.map((p) => p.id);
  const [likedIds, commentsByPost] = await Promise.all([
    // 自分のいいね状態を一括取得
    (async () => {
      if (!userId || ids.length === 0) return new Set<string>();
      const { data: likes } = await supabase
        .from("item_post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", ids);
      return new Set((likes || []).map((l) => l.post_id));
    })(),
    // 最新コメントを一括取得。1 つの投稿にコメントが偏っても他の投稿の分が残るよう、ページの件数×5 件まで読む。
    // そこに入らなかった投稿は、件数と「すべて見る」だけ出る（詳細で全部読める）
    (async () => {
      const map = new Map<string, ItemPostComment[]>();
      if (!withComments || ids.length === 0) return map;
      const { data: rows, error: cErr } = await supabase
        .from("item_post_comments")
        .select("id, post_id, user_id, content, created_at, profile:profiles ( id, username, display_name, avatar_url, is_sample )")
        .in("post_id", ids)
        .order("created_at", { ascending: false })
        .limit(Math.min(ids.length * 5, 200));
      // コメントが読めなくても投稿は出す（カードの下が件数だけになる）
      if (cErr) return map;
      const visible = excludeBlocked((rows || []) as unknown as ItemPostComment[], blocked, (c) => c.user_id);
      for (const c of visible) {
        const list = map.get(c.post_id) ?? [];
        if (list.length < FEED_PREVIEW_COMMENTS) list.push(c);
        map.set(c.post_id, list);
      }
      return map;
    })(),
  ]);

  return {
    posts: posts.map((p) => ({
      ...p,
      is_liked_by_me: likedIds.has(p.id),
      // 新しい順で取ったので、表示は古い→新しい（会話の流れ）に戻す
      preview_comments: [...(commentsByPost.get(p.id) ?? [])].reverse(),
    })),
    next,
  };
}

/**
 * 全投稿フィード。モード別:
 *  - new: 新着順
 *  - popular: 7日以内 × like降順
 *  - following: フォローしているユーザーの投稿のみ
 * 「みんな」のホームのように、先頭の数件だけ欲しいところで使う。
 */
export function useItemPostsFeed({
  mode = "new",
  contentFilter,
  hashtag,
  limit = 30,
}: {
  mode?: FeedMode;
  contentFilter?: string | null;
  hashtag?: string | null;
  limit?: number;
} = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["item-posts-feed", mode, contentFilter, hashtag, user?.id, limit],
    queryFn: async (): Promise<ItemPost[]> => {
      const page = await fetchFeedPage(queryClient, {
        mode,
        contentFilter,
        hashtag,
        userId: user?.id,
        limit,
      });
      return page.posts;
    },
  });
}

/**
 * SNS 風フィード（投稿タブ）。keyset で FEED_PAGE_SIZE 件ずつ読み、カードの下に出す最新コメントも一緒に読む。
 * キーは "item-posts-feed" から始める（いいね・コメントの後の更新・楽観的更新の対象に入るように）。
 */
export function useItemPostsFeedPages({
  mode = "new",
  contentFilter,
  hashtag,
}: {
  mode?: FeedMode;
  contentFilter?: string | null;
  hashtag?: string | null;
} = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ["item-posts-feed", "pages", mode, contentFilter, hashtag, user?.id],
    initialPageParam: null as FeedCursor | null,
    queryFn: ({ pageParam }) =>
      fetchFeedPage(queryClient, {
        mode,
        contentFilter,
        hashtag,
        userId: user?.id,
        limit: FEED_PAGE_SIZE,
        after: pageParam,
        withComments: true,
      }),
    getNextPageParam: (lastPage) => lastPage.next,
  });
}
