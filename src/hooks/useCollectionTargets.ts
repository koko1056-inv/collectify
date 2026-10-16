import { useMemo } from "react";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildTargets,
  dedupeTargets,
  makeSpec,
  rankTargets,
  wantsMissing,
  type CollectionTarget,
  type MissingGoods,
  type OwnedItemLike,
  type ProgressRow,
  type TargetKind,
  type TargetSpec,
} from "@/utils/collectionTargets";

/**
 * コンプの「的」（シリーズ・キャラ・キャラ×種類 など）の分母と、足りないグッズを揃えるフック。
 *
 * 分母の出どころは2通り:
 *  1. サーバーの RPC get_collection_targets（20261016060445・20261016061007）
 *     → あればそれを使う。1回の呼び出しで、分母も「あと少し」の足りないグッズも返る。
 *  2. RPC が無いとき（古い DB・呼べなかったとき）: 必要な的の分だけ、REST で件数だけ数える（count=exact の HEAD）。
 *     カタログは数万件あるので、グッズの一覧は取らない。候補は buildTargets で上位に絞ってあり、
 *     同時に投げる数も CONCURRENCY までにする。分母はカタログ全体の数で、持っている数では変わらないので長めに覚えておく。
 * 足りないグッズは、残りが少なく分母も小さい上位数件だけ、その的のグッズを取って差を取る。
 */

/** RPC が本番にあるか。無いと分かったら、このタブでは二度と呼ばない（毎回 404 を出さないため） */
let targetsRpcAvailable: boolean | undefined;

interface RpcRow {
  kind: TargetKind;
  work: string | null;
  series: string | null;
  character: string | null;
  type: string | null;
  owned: number;
  total: number;
  cover_image: string | null;
  missing: MissingGoods[] | null;
}

function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // PGRST202: スキーマキャッシュに関数が無い / 42883: 関数が存在しない
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message ?? "");
}

async function fetchTargetsRpc(userId: string): Promise<RpcRow[] | null> {
  // 型定義（types.ts）にはまだこの関数が載っていないので、名前を any 経由で渡す
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
  const { data, error } = await rpc.call(supabase, "get_collection_targets", { _user_id: userId });
  if (error) {
    if (isMissingFunction(error)) {
      targetsRpcAvailable = false;
      return null;
    }
    throw error;
  }
  targetsRpcAvailable = true;
  return (data ?? []) as RpcRow[];
}

// ---- RPC が無いときの、件数だけの問い合わせ ----

/** 同時に投げる数。それぞれカタログ全体を数えるので、多く投げると DB を取り合って全部遅くなる */
const CONCURRENCY = 3;
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= CONCURRENCY) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await fn();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

type TagCategory = "series" | "character" | "type";
type TagIds = Record<string, string[]>;
const tagKey = (category: TagCategory, name: string) => `${category}:${name.trim().toLowerCase()}`;

function tagsOf(spec: TargetSpec): { category: TagCategory; name: string }[] {
  const out: { category: TagCategory; name: string }[] = [];
  if (spec.series) out.push({ category: "series", name: spec.series });
  if (spec.character) out.push({ category: "character", name: spec.character });
  if (spec.type) out.push({ category: "type", name: spec.type });
  return out;
}

/** 名前からタグの ID を引く。同じ名前のタグが複数あることがあるので、全部を返す */
async function fetchTagIds(names: { category: TagCategory; name: string }[]): Promise<TagIds> {
  const out: TagIds = {};
  const byCategory = new Map<TagCategory, string[]>();
  for (const n of names) byCategory.set(n.category, [...(byCategory.get(n.category) ?? []), n.name]);
  await Promise.all(
    [...byCategory.entries()].map(async ([category, list]) => {
      const { data, error } = await supabase.from("tags").select("id, name").eq("category", category).in("name", list);
      if (error) throw error;
      for (const row of data ?? []) {
        const k = tagKey(category, row.name);
        out[k] = [...(out[k] ?? []), row.id];
      }
    })
  );
  return out;
}

/** 的の分母（カタログ全体での数）。1つのタグなら item_tags を、2つならもう1つで内側から絞って数える */
async function countTarget(spec: TargetSpec, ids: TagIds): Promise<number | null> {
  const tags = tagsOf(spec);
  const lists = tags.map((t) => ids[tagKey(t.category, t.name)] ?? []);
  if (lists.length === 0 || lists.some((l) => l.length === 0)) return null;
  return limited(async () => {
    if (lists.length === 1) {
      const { count, error } = await supabase
        .from("item_tags")
        .select("official_item_id, official_items!inner(merged_into)", { count: "exact", head: true })
        .in("tag_id", lists[0])
        .is("official_items.merged_into", null);
      if (error) throw error;
      return count ?? 0;
    }
    const { count, error } = await supabase
      .from("item_tags")
      .select("official_item_id, official_items!inner(merged_into, item_tags!inner(tag_id))", { count: "exact", head: true })
      .in("tag_id", lists[0])
      .in("official_items.item_tags.tag_id", lists[1])
      .is("official_items.merged_into", null);
    if (error) throw error;
    return count ?? 0;
  });
}

/** 「あと少し」の的に入っているグッズ（分母が小さいものだけ呼ぶ） */
async function fetchTargetMembers(spec: TargetSpec, ids: TagIds): Promise<MissingGoods[] | null> {
  const tags = tagsOf(spec);
  const lists = tags.map((t) => ids[tagKey(t.category, t.name)] ?? []);
  if (lists.length === 0 || lists.some((l) => l.length === 0)) return null;
  return limited(async () => {
    const inner = lists.length === 1 ? "" : ", item_tags!inner(tag_id)";
    let q = supabase
      .from("item_tags")
      .select(`official_items!inner(id, title, image, merged_into${inner})`)
      .in("tag_id", lists[0])
      .is("official_items.merged_into", null)
      .limit(80);
    if (lists.length > 1) q = q.in("official_items.item_tags.tag_id", lists[1]);
    const { data, error } = await q;
    if (error) throw error;
    const seen = new Map<string, MissingGoods>();
    for (const row of (data ?? []) as unknown as { official_items: { id: string; title: string; image: string | null } }[]) {
      const oi = row.official_items;
      if (oi && !seen.has(oi.id)) seen.set(oi.id, { id: oi.id, title: oi.title, image: oi.image });
    }
    return [...seen.values()];
  });
}

const DAY = 1000 * 60 * 60 * 24;

interface UseCollectionTargetsOptions {
  userId: string | null | undefined;
  items: OwnedItemLike[];
  progress: ProgressRow[];
  pinned: TargetSpec[];
  /** 自分のコレクションのときだけ、キャラ単位の的と足りないグッズまで出す（他人の棚で数えに行かない） */
  isOwn: boolean;
}

export interface CollectionTargetsResult {
  /** 主役の小さな的（作品以外）。あと少しの順 */
  targets: CollectionTarget[];
  /** 作品全体（大きいので折りたたんで出す） */
  works: CollectionTarget[];
  /** 目標（ピン留めした順） */
  goals: CollectionTarget[];
  /** 分母を数えている途中か */
  isCounting: boolean;
}

export function useCollectionTargets({ userId, items, progress, pinned, isOwn }: UseCollectionTargetsOptions): CollectionTargetsResult {
  const base = useMemo(
    () => buildTargets(items, progress, isOwn ? pinned : [], { characters: isOwn }),
    [items, progress, pinned, isOwn]
  );
  const ownedIds = useMemo(
    () => new Set(items.map((i) => i.official_item_id).filter((v): v is string => !!v)),
    [items]
  );

  // 1) サーバーの RPC（あれば）。持っている数で変わるので ["user-items", ...] の下に置き、追加・削除で引き直す
  const rpcEnabled = !!userId && isOwn && targetsRpcAvailable !== false;
  const rpc = useQuery({
    queryKey: ["user-items", "collection-targets", userId],
    enabled: rpcEnabled,
    queryFn: () => fetchTargetsRpc(userId as string),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    retry: false,
  });
  const rpcRows = useMemo(() => {
    const map = new Map<string, RpcRow>();
    for (const r of rpc.data ?? []) {
      const spec = makeSpec({
        kind: r.kind,
        work: r.work ?? undefined,
        series: r.series ?? undefined,
        character: r.character ?? undefined,
        type: r.type ?? undefined,
      });
      map.set(spec.key, r);
    }
    return map;
  }, [rpc.data]);
  // RPC の答えを待つ（あるかどうか分かるまでは、REST で数えに行かない）
  const rpcSettled = !rpcEnabled || rpc.isFetched || rpc.isError;

  // 2) RPC で分母が埋まらなかった的は、件数だけを数える
  const needCount = useMemo(
    () => (isOwn && rpcSettled ? base.filter((t) => t.total == null && !rpcRows.has(t.key)) : []),
    [base, rpcRows, rpcSettled, isOwn]
  );
  // 分母が最初から分かっている的（シリーズ）のうち、足りないグッズを出しそうなもの。タグの ID を一緒に引いておく
  const needMembers = useMemo(() => {
    if (!isOwn || !rpcSettled) return [] as TargetSpec[];
    return base.filter((t) => t.total != null && wantsMissing(t) && !rpcRows.get(t.key)?.missing);
  }, [base, rpcRows, rpcSettled, isOwn]);

  const tagNames = useMemo(() => {
    const map = new Map<string, { category: TagCategory; name: string }>();
    for (const t of [...needCount, ...needMembers]) for (const n of tagsOf(t)) map.set(tagKey(n.category, n.name), n);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [needCount, needMembers]);
  const tagIdsQuery = useQuery({
    queryKey: ["catalog-tag-ids", tagNames.map(([k]) => k)],
    enabled: tagNames.length > 0,
    queryFn: () => fetchTagIds(tagNames.map(([, v]) => v)),
    staleTime: DAY,
    gcTime: DAY,
    placeholderData: keepPreviousData,
  });
  const tagIds = tagIdsQuery.data;

  const counts = useQueries({
    queries: needCount.map((t) => ({
      queryKey: ["collection-target-total", t.key],
      enabled: !!tagIds && !tagIdsQuery.isPlaceholderData,
      queryFn: () => countTarget(t, tagIds as TagIds),
      // 分母はカタログ全体の数。新しいグッズが入るのはまれなので、長めに覚えておく
      staleTime: 1000 * 60 * 60,
      gcTime: DAY,
      retry: 1,
    })),
  });
  const countMap = new Map<string, number | null>();
  needCount.forEach((t, i) => {
    const d = counts[i]?.data;
    if (d !== undefined) countMap.set(t.key, d);
  });

  // 分母が分かった時点の的（足りないグッズの対象を決めるため）
  const withTotals = base.map((t) => {
    const r = rpcRows.get(t.key);
    const total = t.total ?? r?.total ?? countMap.get(t.key) ?? null;
    return { ...t, total: total == null ? null : Math.max(total, t.owned), cover: t.cover ?? r?.cover_image ?? null };
  });

  // 3) あと少しの的（上位3つ）は、足りないグッズを出す
  const nearly = rankTargets(dedupeTargets(withTotals))
    .filter((t) => wantsMissing(t) && !rpcRows.get(t.key)?.missing)
    .slice(0, 3);
  const members = useQueries({
    queries: nearly.map((t) => ({
      queryKey: ["collection-target-members", t.key],
      enabled: !!tagIds && !tagIdsQuery.isPlaceholderData && isOwn,
      queryFn: () => fetchTargetMembers(t, tagIds as TagIds),
      staleTime: 1000 * 60 * 60,
      gcTime: DAY,
      retry: 1,
    })),
  });
  const memberMap = new Map<string, MissingGoods[]>();
  nearly.forEach((t, i) => {
    const d = members[i]?.data;
    if (d) memberMap.set(t.key, d);
  });

  const all = withTotals.map((t) => {
    const fromRpc = rpcRows.get(t.key)?.missing;
    const pool = fromRpc ?? memberMap.get(t.key);
    // 持っている物は、この的に限らず全部除く（RPC の返した後に追加した分もすぐ消えるように）
    const missing = pool?.filter((m) => !ownedIds.has(m.id));
    return missing ? { ...t, missing } : t;
  });

  const deduped = dedupeTargets(all);
  const targets = rankTargets(deduped.filter((t) => t.kind !== "work"));
  const works = rankTargets(deduped.filter((t) => t.kind === "work"));
  const byKey = new Map(all.map((t) => [t.key, t]));
  const goals = (isOwn ? pinned : []).map((p) => byKey.get(p.key)).filter((t): t is CollectionTarget => !!t);

  return {
    targets,
    works,
    goals,
    isCounting: (rpcEnabled && rpc.isLoading) || tagIdsQuery.isLoading || counts.some((c) => c.isLoading),
  };
}
