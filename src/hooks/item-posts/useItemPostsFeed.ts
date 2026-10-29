import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ItemPost, sortImages } from "./useItemPosts";
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
  /** 投稿に紐づくグッズ（カードの下の札）。読めなかった・紐づいていないときは null */
  goods?: FeedGoods | null;
}

/** 投稿のグッズの札に出すもの。公式のグッズがあればそのページへ、なければ持ち主のグッズをひらく */
export interface FeedGoods {
  title: string;
  image: string | null;
  officialItemId: string | null;
  userItemId: string | null;
}

type GoodsRow = { id: string; title: string | null; image: string | null; content_name: string | null; official_item_id?: string | null };

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
  /** お題イベントの投稿だけ（イベントのページ）。公開プロフィールの人と自分の投稿だけにする */
  eventId?: string | null;
  userId?: string | null;
  /** 指定すると、そのグッズ（公式）に結びついた投稿だけにする。グッズのページの「このグッズの話題」 */
  officialItemId?: string | null;
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
 *  - グッズ（札・作品の絞り込み） … official_items / user_items を id で 1 回ずつ
 */
async function fetchFeedPage(queryClient: QueryClient, args: FeedArgs): Promise<FeedPage> {
  const { mode, contentFilter, hashtag, eventId, userId, officialItemId, limit, after, withComments } = args;
  let query = supabase
    .from("item_posts")
    .select(
      eventId
        ? `
      *,
      images:item_post_images ( id, image_url, display_order ),
      profile:profiles ( id, username, display_name, avatar_url, is_sample, privacy_level )
    `
        : `
      *,
      images:item_post_images ( id, image_url, display_order ),
      profile:profiles ( id, username, display_name, avatar_url, is_sample )
    `
    )
    .limit(limit);
  if (eventId) query = query.eq("event_id", eventId);

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

  // グッズの話題（持ち物への投稿も、トリガーで元の公式グッズが入っている。統合されたグッズの投稿は統合先へ付け替え済み）
  if (officialItemId) {
    query = query.eq("official_item_id", officialItemId);
  }

  // ハッシュタグ検索
  if (hashtag) {
    query = query.ilike("caption", `%#${hashtag}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  // 埋め込みの画像は URL が空のことがある・並びが不定なので、下で整える
  const raw = (data || []) as unknown as ItemPost[];
  // 次のカーソルは絞り込み（ブロック・作品・中身のない投稿）の前の最後の行から作る。絞り込んで 0 件のページがあっても先へ進めるように
  const last = raw[raw.length - 1];
  const next: FeedCursor | null =
    raw.length === limit && last ? { created_at: last.created_at, id: last.id, like_count: last.like_count } : null;

  // ブロックした人・ブロックされた人の投稿は並べない
  const blocked = await fetchBlockedUserIds(queryClient, userId);
  let posts = excludeBlocked(raw, blocked, (p) => p.user_id);
  // イベントのページは、だれでも開ける公開のページ。鍵付き（フォロワー限定・非公開）の人の投稿は、本人にだけ見せる
  if (eventId) {
    posts = posts.filter((p) => {
      if (p.user_id === userId) return true;
      const level = (p.profile as { privacy_level?: string | null } | null | undefined)?.privacy_level;
      return !!p.profile && (level ?? "public") === "public";
    });
  }

  // グッズ（札に出す名前・写真と、作品での絞り込み）。ページの id でまとめて 1 回ずつ（official / user_items）。
  // 作品で絞り込むときもこの結果を使う（同じ表を 2 回読まない）
  const goodsById = new Map<string, GoodsRow>();
  if (withComments || contentFilter) {
    const officialIds = [...new Set(posts.map((p) => p.official_item_id).filter(Boolean) as string[])];
    const userItemIds = [...new Set(posts.map((p) => p.user_item_id).filter(Boolean) as string[])];
    const [officialRes, userRes] = await Promise.all([
      officialIds.length
        ? supabase.from("official_items").select("id, title, image, content_name").in("id", officialIds)
        : Promise.resolve({ data: [] as GoodsRow[] }),
      userItemIds.length
        ? supabase.from("user_items").select("id, title, image, content_name, official_item_id").in("id", userItemIds)
        : Promise.resolve({ data: [] as GoodsRow[] }),
    ]);
    // 読めなかったとき（権限など）は札を出さないだけ。投稿は出す
    for (const r of [...(officialRes.data ?? []), ...(userRes.data ?? [])] as GoodsRow[]) goodsById.set(r.id, r);
  }
  const goodsOf = (p: ItemPost) =>
    (p.official_item_id && goodsById.get(p.official_item_id)) || (p.user_item_id && goodsById.get(p.user_item_id)) || null;

  // コンテンツ名フィルタ（official_items or user_items の作品名で絞る）
  if (contentFilter) {
    posts = posts.filter((p) => {
      const o = p.official_item_id ? goodsById.get(p.official_item_id) : undefined;
      const u = p.user_item_id ? goodsById.get(p.user_item_id) : undefined;
      return o?.content_name === contentFilter || u?.content_name === contentFilter;
    });
  }

  // URL が空の写真は落とす（真っ白な写真を出さない）。写真がなくても本文があれば文字だけの投稿として並べる。
  // 写真も本文もない投稿（壊れた行）だけは並べない
  posts = posts
    .map((p) => ({ ...p, images: sortImages(p.images) }))
    .filter((p) => p.images.length > 0 || !!p.caption?.trim());

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
      goods: withComments ? toGoods(p, goodsOf(p)) : undefined,
    })),
    next,
  };
}

function toGoods(p: ItemPost, row: GoodsRow | null): FeedGoods | null {
  if (!row?.title) return null;
  const isOfficial = row.id === p.official_item_id;
  return {
    title: row.title,
    image: row.image,
    officialItemId: isOfficial ? row.id : row.official_item_id ?? null,
    userItemId: isOfficial ? null : row.id,
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
  eventId,
}: {
  mode?: FeedMode;
  contentFilter?: string | null;
  hashtag?: string | null;
  eventId?: string | null;
} = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ["item-posts-feed", "pages", mode, contentFilter, hashtag, user?.id, eventId ?? null],
    initialPageParam: null as FeedCursor | null,
    queryFn: ({ pageParam }) =>
      fetchFeedPage(queryClient, {
        mode,
        contentFilter,
        hashtag,
        eventId,
        userId: user?.id,
        limit: FEED_PAGE_SIZE,
        after: pageParam,
        withComments: true,
      }),
    getNextPageParam: (lastPage) => lastPage.next,
  });
}

/**
 * グッズのページの「このグッズの話題」。そのグッズに結びついた投稿を、タイムラインと同じカードで新しい順に読む。
 * キーは "item-posts-feed" から始める（いいね・コメント・新しい投稿の後の更新がそのまま効くように）。
 * カードの下のグッズの札は、いま見ているグッズと同じなので出さない（goods: null）。
 */
export function useGoodsPostsPages(officialItemId: string | null | undefined, { pageSize = 5 }: { pageSize?: number } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ["item-posts-feed", "goods", officialItemId, user?.id, pageSize],
    enabled: !!officialItemId,
    initialPageParam: null as FeedCursor | null,
    queryFn: async ({ pageParam }) => {
      const page = await fetchFeedPage(queryClient, {
        mode: "new",
        userId: user?.id,
        officialItemId,
        limit: pageSize,
        after: pageParam,
        withComments: true,
      });
      return { ...page, posts: page.posts.map((p) => ({ ...p, goods: null })) };
    },
    getNextPageParam: (lastPage) => lastPage.next,
  });
}
