import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOshiContents } from "@/hooks/useOshiContents";

/**
 * 推しの新商品（新着・発売予定・人気）を読む。
 *
 * カタログ（official_items）は毎日自動で新商品を取り込んでいて、5万件を超える。
 * 重くしないよう、どの読み取りも「作品名（content_name）」「発売日（release_date）」
 * 「登録日時（created_at）」のどれかで絞り、件数は limit で切る。件数だけ要るときは head で数える。
 * 使う索引: (content_name, release_date) where merged_into is null / (created_at) where merged_into is null。
 */

export interface ReleaseItem {
  id: string;
  title: string;
  image: string;
  price: string | null;
  release_date: string | null;
  content_name: string | null;
  created_at: string;
}

const COLS = "id, title, image, price, release_date, content_name, created_at";

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJst(): string {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

/** YYYY-MM-DD に日数を足す（日付だけの計算なので UTC で扱う） */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 日時（ISO）を日本時間の日付（YYYY-MM-DD）にする */
export function jstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
}

/** 作品で絞った official_items の読み取りの土台。作品が無い（推しを決めていない）ときはカタログ全体 */
function catalog(contents: string[], withCount = false) {
  let q = supabase
    .from("official_items")
    .select(COLS, withCount ? { count: "exact" } : undefined)
    .is("merged_into", null)
    .neq("image", "/placeholder.svg");
  if (contents.length) q = q.in("content_name", contents);
  return q;
}

/** 発売日が from〜to（両端を含む）のグッズ。カレンダーと「今週発売」 */
export function useReleasesInRange(contents: string[], from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ["oshi-releases-range", contents.join("|"), from, to],
    enabled,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<ReleaseItem[]> => {
      const { data, error } = await catalog(contents)
        .gte("release_date", from)
        .lte("release_date", to)
        .order("release_date", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as ReleaseItem[];
    },
  });
}

/** from 以降でいちばん近い発売予定（今週に何も無いときの「このあとの発売」など） */
export function useUpcomingReleases(contents: string[], from: string, limit = 12, enabled = true) {
  return useQuery({
    queryKey: ["oshi-releases-upcoming", contents.join("|"), from, limit],
    enabled,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<ReleaseItem[]> => {
      const { data, error } = await catalog(contents)
        .gte("release_date", from)
        .order("release_date", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ReleaseItem[];
    },
  });
}

/** カタログに新しく入ったグッズ（直近 days 日）。total は絞り込みに合う件数 */
export function useOshiNewArrivals(contents: string[], days = 14, limit = 60, enabled = true) {
  return useQuery({
    queryKey: ["oshi-new-arrivals", contents.join("|"), days, limit],
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400e3).toISOString();
      const { data, error, count } = await catalog(contents, true)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { items: (data ?? []) as ReleaseItem[], total: count ?? data?.length ?? 0 };
    },
  });
}

export interface PopularGoods {
  id: string;
  title: string;
  image: string | null;
  content_name: string | null;
  owner_count: number;
}

// 作品ごとの人気（持っている人が多い順）を返す RPC。マイグレーションを当てるまでは無いので、
// 1回 404 を受けたらこのセッションでは呼ばない（毎回 404 を出さない）
let popularRpcMissing = false;

/**
 * この作品で人気のグッズ（持っている人が多い順）。
 * 本命は get_popular_goods_for_contents（作品で絞って持ち主の数で並べる）。
 * まだ無い間は、既存の search_official_items_with_owners（作品名で引き、持ち主の数で並べる）で代わりにする。
 * こちらは作品名に当たる先頭300件の中での並びなので、大きな作品では取りこぼしがある。
 */
export function usePopularGoods(content: string | null, limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["oshi-popular-goods", content, limit, user?.id],
    // どちらの RPC もログインした人だけが呼べる
    enabled: !!user && !!content,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<PopularGoods[]> => {
      if (!popularRpcMissing) {
        // 型定義に無い（マイグレーション前の）関数なので、名前を広げて呼ぶ（this を保つため bind する）
        const rpc = supabase.rpc.bind(supabase) as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { code?: string } | null }>;
        const { data, error } = await rpc("get_popular_goods_for_contents", { _contents: [content], _limit: limit });
        if (!error) return ((data ?? []) as PopularGoods[]).filter((r) => r.owner_count > 0);
        if (error.code === "PGRST202" || error.code === "42883") popularRpcMissing = true;
        else throw error;
      }
      const { data, error } = await supabase.rpc("search_official_items_with_owners", { _q: content!, _limit: 60 });
      if (error) throw error;
      return ((data ?? []) as PopularGoods[])
        .filter((r) => r.owner_count > 0 && r.content_name === content)
        .slice(0, limit);
    },
  });
}

/** 推しの新着を「最後に見た時刻」から数えるための保存場所（この端末だけ。無くても動く） */
const SEEN_KEY = (uid: string) => `collectify-oshi-new-seen:${uid}`;
/** 初めて見る人には、直近3日の新着を「まだ見ていない」として数える（以前の「新着」ボタンと同じ幅） */
const FIRST_WINDOW_MS = 72 * 3600e3;
/** 何日もあいた人でも、数えるのは直近7日まで（バッジが大きくなりすぎないように） */
const MAX_WINDOW_MS = 7 * 86400e3;

function readSeen(uid: string | undefined): string | null {
  if (!uid) return null;
  try {
    return localStorage.getItem(SEEN_KEY(uid));
  } catch {
    return null;
  }
}

/**
 * 推しの新着のうち、まだ見ていない件数（バッジ用）と、「見た」にする操作。
 * 「最後に見た時刻」は localStorage に置く（DB を変えずに作れる範囲。端末をまたぐと数え直しになる）。
 */
export function useOshiNewBadge() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { names, ready } = useOshiContents();
  const [seenAt, setSeenAt] = useState<string | null>(() => readSeen(uid));
  useEffect(() => setSeenAt(readSeen(uid)), [uid]);

  const now = Date.now();
  const floor = now - MAX_WINDOW_MS;
  const sinceMs = seenAt ? Math.max(Date.parse(seenAt) || 0, floor) : now - FIRST_WINDOW_MS;
  // 分単位に丸める（描くたびにキーが変わって読み直さないように）
  const since = new Date(Math.floor(sinceMs / 60000) * 60000).toISOString();

  const count = useQuery({
    queryKey: ["oshi-new-unseen", uid, names.join("|"), since],
    enabled: !!uid && ready && names.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { count: n, error } = await supabase
        .from("official_items")
        .select("id", { count: "exact", head: true })
        .in("content_name", names)
        .is("merged_into", null)
        .neq("image", "/placeholder.svg")
        .gt("created_at", since);
      if (error) throw error;
      return n ?? 0;
    },
  });

  const markSeen = useCallback(() => {
    if (!uid) return;
    const at = new Date().toISOString();
    try {
      localStorage.setItem(SEEN_KEY(uid), at);
    } catch {
      // 保存できなくても、この画面を開いている間は「見た」にする
    }
    setSeenAt(at);
    qc.setQueriesData({ queryKey: ["oshi-new-unseen", uid] }, () => 0);
  }, [uid, qc]);

  return { unseen: count.data ?? 0, seenAt, markSeen, hasOshi: names.length > 0 };
}
