import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfficialItem } from "@/types";
import {
  catalogItemsAfterArgs,
  cursorOf,
  fetchAllByCursors,
  type CatalogCursor,
  type CatalogPageCursorRow,
} from "@/utils/catalogKeyset";

/** PostgREST が1回で返せる上限（既定1000行）に合わせる */
const PAGE_SIZE = 1000;
/** 同時に投げるリクエスト数。多すぎると回線を取り合って遅くなる */
const CONCURRENCY = 4;
/** 作品を選ばないときに読み込む件数（新しい順）。数万件ある全体を毎回読み込まないための上限。 */
export const RECENT_LIMIT = 1500;

/** 一覧のカードと絞り込みに使う列（キャラページも同じ形で読む） */
export const OFFICIAL_ITEM_SELECT = `
  id,
  title,
  image,
  price,
  release_date,
  created_at,
  created_by,
  content_name,
  description,
  item_type,
  quantity,
  item_tags (
    tags (
      id,
      name,
      category
    )
  )
`;

/** catalog_items_after の並びと同じ（新しい発売日→新しい登録日→id）。サーバーの並びをそのまま保つための念押し */
const KEYSET_ORDER = [
  ["release_date", false],
  ["created_at", false],
  ["id", true],
] as const;

/**
 * カーソルの次から読む（catalog_items_after）。作品を選んでいなければすべての作品。
 * 「何件目から」（OFFSET）ではないので、奥のページでも先頭と同じ重さ（20261028030000_catalog_keyset_paging.sql）。
 */
async function fetchItemsAfter(content: string | null, after: CatalogCursor | null, limit: number, until: CatalogCursor | null = null) {
  let q = supabase.rpc("catalog_items_after", catalogItemsAfterArgs(content, after, limit, until)).select(OFFICIAL_ITEM_SELECT);
  for (const [column, ascending] of KEYSET_ORDER) q = q.order(column, { ascending });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
}

export function toItems(rows: unknown[]): OfficialItem[] {
  return (rows as Record<string, unknown>[]).map((item) => ({ ...item, artist: null, anime: null })) as unknown as OfficialItem[];
}

interface UseOfficialItemsOptions {
  /** 指定すると、その作品のグッズを全件読み込む。未指定なら新しい順に RECENT_LIMIT 件まで。 */
  content?: string | null;
  enabled?: boolean;
}

/**
 * 公式グッズを読み込む。
 *
 * カタログは数万件になるので、全件を一度に読み込まない。
 *  - 作品を選んでいる: その作品を全件（境目を先に 1 回で取り、1000件ずつ並列で）
 *  - 選んでいない:     新しい順に RECENT_LIMIT 件
 * 作品を選ばない一覧・検索は useCatalogFeed（サーバーでページ送り）を使う。
 */
export function useOfficialItems(options: UseOfficialItemsOptions = {}) {
  const content = options.content?.trim() || null;
  return useQuery<OfficialItem[]>({
    queryKey: ["official-items", content ?? "__recent"],
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // 作品を切り替えている間、前の一覧を出したままにして、画面が空にならないようにする
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // ページの境目（1000 件ごとの行のキー）と全体の件数を 1 回で取り、各ページを「境目の次から次の境目まで」並列に読む
      const { data: cursors, error } = await supabase.rpc("catalog_page_cursors", {
        p_content: content,
        p_page_size: PAGE_SIZE,
        p_max_rows: content ? null : RECENT_LIMIT,
      });
      if (error) throw error;
      const { rows } = await fetchAllByCursors(
        (cursors ?? []) as CatalogPageCursorRow[],
        ({ after, until, limit }) => fetchItemsAfter(content, after, limit, until),
        { pageSize: PAGE_SIZE, concurrency: CONCURRENCY, maxRows: content ? null : RECENT_LIMIT }
      );
      return toItems(rows);
    },
  });
}

/** 作品を選んだときに、全件より先に読む先頭の件数（一覧の最初の1画面＋少し） */
export const CONTENT_PREVIEW_SIZE = 60;

/**
 * 作品を選んだときの一覧の「先頭だけ」。useOfficialItems と同じ並び順で、最初の CONTENT_PREVIEW_SIZE 件。
 *
 * useOfficialItems は作品のグッズを全件読む（絞り込みを手元でするため）。ちいかわのように 1 万件ある作品だと
 * 約 10MB・11 回のリクエストで、データセンターの回線でも 9 秒、スマホでは十数秒、一覧に何も出なかった
 * （「一覧から選ぶ」は推しの作品を開いた状態で始まるので、ほとんどの人がこれを待っていた）。
 * 先頭だけを先に読んで出しておけば、画像はすぐ読み始められる。並びは同じなので、全件が届いても先頭は入れ替わらない。
 */
export function useOfficialItemsPreview(content: string | null | undefined, enabled = true) {
  const name = content?.trim() || null;
  return useQuery<OfficialItem[]>({
    queryKey: ["official-items-preview", name],
    enabled: enabled && !!name,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    queryFn: async () => toItems(await fetchItemsAfter(name, null, CONTENT_PREVIEW_SIZE)),
  });
}

export interface CatalogContent {
  name: string;
  count: number;
}

/** 作品ごとの件数（多い順）。作品チップの表示に使う。 */
export function useCatalogContents() {
  return useQuery<CatalogContent[]>({
    queryKey: ["catalog-content-counts"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("catalog_content_counts");
      if (error) throw error;
      return (data ?? []).map((r: { content_name: string; item_count: number }) => ({
        name: r.content_name,
        count: Number(r.item_count),
      }));
    },
  });
}

/**
 * 作品ごとの「表紙」（その作品の新しいグッズの写真を数枚、重複なし）。
 * 推し選びの作品カードに実物のグッズを並べるのに使う。表紙が無くても画面は成り立つので、失敗は通知しない。
 */
export function useCatalogContentCovers(perContent = 2) {
  return useQuery<Map<string, string[]>>({
    queryKey: ["catalog-content-covers", perContent],
    staleTime: 1000 * 60 * 30,
    meta: { silentError: true },
    queryFn: async () => {
      const { data, error } = await supabase.rpc("catalog_content_covers", { per_content: perContent });
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.content_name, r.images ?? []]));
    },
  });
}

/** 作品を選ばないときの一覧を、サーバーから少しずつ（FEED_PAGE 件ずつ）読み足す件数 */
export const FEED_PAGE = 200;

type FeedPageParam = number | CatalogCursor | null;
interface FeedPage {
  items: OfficialItem[];
  total: number | null;
  next: FeedPageParam;
}

/**
 * 一覧に出るグッズ全体の件数（統合済み・一覧から外したものを除く）。
 * count=exact は本番で Seq Scan（冷えていると 4 秒超え）になり、ゲストの時間切れ（57014）の元だったので、
 * 作り置きの件数を返す catalog_listed_total を使う（20261028030000_catalog_keyset_paging.sql）。
 */
async function countListedItems() {
  const { data, error } = await supabase.rpc("catalog_listed_total");
  if (error) throw error;
  return Number(data ?? 0);
}

/**
 * 作品を選ばない一覧（「すべて」＋キーワード検索）を、全件に届くようにサーバーでページ送りする。
 * 新しい順。言葉を入れたときは、サーバーのあいまい検索で近い順（ひらがな/カタカナ・全角/半角・英語名・別名・打ち間違いを許す）。
 * 件数は先頭ページと一緒にサーバーが数えた全体の数。
 */
export function useCatalogFeed(term: string, enabled = true) {
  const normalized = term.trim().replace(/\s+/g, " ");
  // 1文字（「ミ」など）では検索しない。ほぼ全件に当たってサーバーが時間切れになり、
  // 「データの読み込みに失敗しました」が出ていた（サーバー側も2文字未満は空を返す）。2文字目までは新しい順の一覧のまま
  const q = normalized.replace(/ /g, "").length >= 2 ? normalized : "";
  const query = useInfiniteQuery({
    queryKey: ["official-items-feed", q],
    enabled,
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
    // 言葉を入れたとき: あいまい検索の何件目から（数）。入れないとき: 前のページの最後の 1 件（カーソル）。先頭は null
    initialPageParam: null as FeedPageParam,
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      // 言葉を入れたとき: サーバーのあいまい検索（表記ゆれ・英語名・別名・打ち間違い）で、近い順の id を取り、中身を読む
      if (q) {
        const offset = typeof pageParam === "number" ? pageParam : 0;
        const { data: hits, error: hitErr } = await supabase.rpc("search_official_items", {
          _q: q,
          _limit: FEED_PAGE,
          _offset: offset,
        });
        if (hitErr) throw hitErr;
        const rows = hits ?? [];
        const ids = rows.map((r) => r.id);
        const total = rows.length > 0 ? Number(rows[0].total) : 0;
        if (ids.length === 0) return { items: [] as OfficialItem[], total: offset === 0 ? 0 : null, next: null };
        const { data, error } = await supabase.from("official_items").select(OFFICIAL_ITEM_SELECT).in("id", ids);
        if (error) throw error;
        const byId = new Map((data ?? []).map((r: { id: string }) => [r.id, r]));
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as unknown[];
        return { items: toItems(ordered), total: offset === 0 ? total : null, next: ids.length === FEED_PAGE ? offset + FEED_PAGE : null };
      }

      // 新しい順の一覧: 前のページの最後の 1 件の次から（keyset）。件数は先頭のページのときだけ（作り置きから）
      const after = pageParam !== null && typeof pageParam === "object" ? pageParam : null;
      const [rows, count] = await Promise.all([
        fetchItemsAfter(null, after, FEED_PAGE),
        after ? Promise.resolve(null) : countListedItems(),
      ]);
      return {
        items: toItems(rows),
        total: count,
        next: rows.length === FEED_PAGE ? cursorOf(rows[rows.length - 1]) : null,
      };
    },
    getNextPageParam: (last) => last.next,
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    items: pages.flatMap((p) => p.items),
    total: pages[0]?.total ?? null,
  };
}

/** 作品名（日本語）→ 英語表記。英語表示と、英語名での検索に使う。 */
export function useContentNamesEn() {
  return useQuery<Map<string, string>>({
    queryKey: ["content-names-en"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_names").select("name, name_en").not("name_en", "is", null);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.name as string, r.name_en as string]));
    },
  });
}

export interface ContentNameAliasRow {
  name: string;
  aliases: string[] | null;
}

/**
 * 作品名と別名の一覧（content_names の全行）。
 * aliases は生成済みの型定義にまだ反映されていないため "*" で取って手元で読む（InitialInterestSelection と同じやり方）。
 */
export function useContentNameAliases() {
  return useQuery<ContentNameAliasRow[]>({
    queryKey: ["content-name-aliases"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_names").select("*");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        name: r.name as string,
        aliases: (r as { aliases?: string[] | null }).aliases ?? null,
      }));
    },
  });
}

/**
 * 推しとして選んだ作品名を、実際にグッズのある作品名に解決する。
 *
 * 同じ作品でも表記が割れて別の content_names 行になっていることがある
 * （例: 「Mrs.GREEN APPLE」はグッズ 0 件で、同じアーティストの「ミセスグリーンアップル」側にグッズが入っている）。
 * 別名（aliases）にその名前を持つ、グッズのある作品を探す。見つからなければ null（＝そのままでは出せない）。
 */
export function resolveStockedContentName(
  name: string,
  withItems: ReadonlySet<string>,
  aliasRows: ContentNameAliasRow[]
): string | null {
  if (withItems.has(name)) return name;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  for (const row of aliasRows) {
    if (!withItems.has(row.name)) continue;
    if ((row.aliases ?? []).some((alias) => alias.trim().toLowerCase() === normalized)) return row.name;
  }
  return null;
}
