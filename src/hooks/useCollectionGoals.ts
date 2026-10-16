import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { makeSpec, type TargetKind, type TargetSpec } from "@/utils/collectionTargets";

/**
 * 「集めるもの」（自分で決めたコンプの目標）の読み書き。
 *
 * 作品全体の大きな分母ではなく、自分が集めたいシリーズ・キャラをピン留めして、その達成率を一番上に出すためのもの。
 * 目標は DB（collection_goals テーブル。本人だけが読み書き・1人6個まで）に置く。端末を替えても残る。
 *
 * 以前は端末内（localStorage）に置いていた。最初の読み込みで、端末内の目標を一度だけ DB に書き写してから消す。
 * DB に届かないとき（オフラインなど）は、端末内の目標をそのまま使う（画面から目標が消えないように）。
 */

export interface CollectionGoal extends TargetSpec {
  pinnedAt: string;
}

/** 一番上に並べるので、多すぎると「目標」ではなくなる（DB のトリガーと同じ 6） */
export const MAX_GOALS = 6;

/** 作品全体（work）は分母が大きすぎて目標にならないので、DB にも置けない */
const GOAL_KINDS = new Set<TargetKind>(["series", "character", "character_type", "series_character"]);

const LEGACY_PREFIX = "collectify.collectionGoals.v1.";

interface GoalRow {
  goal_key: string;
  kind: string;
  series: string | null;
  character: string | null;
  type: string | null;
  created_at: string;
}

type Result<T> = Promise<{ data: T | null; error: { code?: string; message?: string } | null }>;
/** 型定義（types.ts）にまだ collection_goals が無いので、ここで使う形だけを書いておく */
interface GoalsTable {
  select(columns: string): { eq(column: string, value: string): { order(column: string, opts: { ascending: boolean }): Result<GoalRow[]> } };
  upsert(rows: Record<string, unknown>[], opts: { onConflict: string; ignoreDuplicates: boolean }): Result<null>;
  delete(): { eq(column: string, value: string): { eq(column: string, value: string): Result<null> } };
}
const goalsTable = () => (supabase.from as unknown as (name: string) => GoalsTable)("collection_goals");

const queryKey = (userId: string | null | undefined) => ["collection-goals", userId] as const;

function isGoalKind(kind: unknown): kind is TargetKind {
  return typeof kind === "string" && GOAL_KINDS.has(kind as TargetKind);
}

function fromRow(r: GoalRow): CollectionGoal | null {
  if (!isGoalKind(r.kind)) return null;
  const spec = makeSpec({
    kind: r.kind,
    series: r.series ?? undefined,
    character: r.character ?? undefined,
    type: r.type ?? undefined,
  });
  return { ...spec, pinnedAt: r.created_at };
}

function toRow(userId: string, g: TargetSpec) {
  return {
    user_id: userId,
    goal_key: g.key,
    kind: g.kind,
    series: g.series ?? null,
    character: g.character ?? null,
    type: g.type ?? null,
  };
}

/** 以前の端末内の目標。読めないとき（プライベートブラウズなど）は空 */
function readLegacy(userId: string): CollectionGoal[] {
  try {
    const raw = localStorage.getItem(LEGACY_PREFIX + userId);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is CollectionGoal => !!v && typeof v === "object" && isGoalKind((v as CollectionGoal).kind))
      .map((g) => {
        const { kind, series, character, type } = g;
        return { ...makeSpec({ kind, series, character, type }), pinnedAt: g.pinnedAt ?? new Date(0).toISOString() };
      });
  } catch {
    return [];
  }
}

function clearLegacy(userId: string) {
  try {
    localStorage.removeItem(LEGACY_PREFIX + userId);
  } catch {
    /* 消せなくても、次に読んだとき DB に同じキーがあるので重複しない */
  }
}

async function fetchGoals(userId: string): Promise<CollectionGoal[]> {
  const list = () => goalsTable().select("goal_key, kind, series, character, type, created_at").eq("user_id", userId).order("created_at", { ascending: true });

  const { data, error } = await list();
  if (error) {
    // DB に届かないときは端末内の目標で代わりにする（書き写しもしない）
    console.error("[useCollectionGoals] load failed:", error);
    return readLegacy(userId);
  }
  const rows = (data ?? []).map(fromRow).filter((g): g is CollectionGoal => !!g);

  // 端末内に以前の目標が残っていれば、一度だけ DB に書き写す（上限の 6 を超える分は書かない）
  const legacy = readLegacy(userId);
  if (legacy.length === 0) return rows;
  const have = new Set(rows.map((g) => g.key));
  const add = legacy.filter((g) => !have.has(g.key)).slice(0, Math.max(0, MAX_GOALS - rows.length));
  if (add.length > 0) {
    const { error: upErr } = await goalsTable().upsert(add.map((g) => toRow(userId, g)), { onConflict: "user_id,goal_key", ignoreDuplicates: true });
    if (upErr) {
      console.error("[useCollectionGoals] migrate failed:", upErr);
      return rows;
    }
  }
  clearLegacy(userId);
  const again = await list();
  return again.error ? rows : (again.data ?? []).map(fromRow).filter((g): g is CollectionGoal => !!g);
}

export function useCollectionGoals(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  const key = queryKey(userId);

  const { data } = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: () => fetchGoals(userId as string),
    staleTime: 1000 * 60 * 5,
  });
  const goals = useMemo(() => (userId ? data ?? [] : []), [userId, data]);
  const keys = useMemo(() => new Set(goals.map((g) => g.key)), [goals]);

  const commit = useCallback(
    async (next: CollectionGoal[], write: () => Result<null>) => {
      if (!userId) return;
      const prev = queryClient.getQueryData<CollectionGoal[]>(key);
      // 先に画面を変える（押したらすぐピンが付く・外れる）。失敗したら元に戻す
      queryClient.setQueryData(key, next);
      const { error } = await write();
      if (error) {
        console.error("[useCollectionGoals] save failed:", error);
        queryClient.setQueryData(key, prev);
      }
      // 目標が変わるとコンプの的（サーバーの集計）も変わる。ガイドの「集めるもの」の報酬もここで確かめに行く
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ["user-items", "collection-targets", userId] });
    },
    [userId, queryClient, key]
  );

  /** ピン留め・解除。上限に達しているときは false を返す（呼び出し側で知らせる） */
  const toggle = useCallback(
    (spec: TargetSpec): boolean => {
      if (!userId) return false;
      if (keys.has(spec.key)) {
        void commit(goals.filter((g) => g.key !== spec.key), () => goalsTable().delete().eq("user_id", userId).eq("goal_key", spec.key));
        return true;
      }
      if (goals.length >= MAX_GOALS) return false;
      if (!isGoalKind(spec.kind)) return false;
      const { kind, series, character, type } = spec;
      const goal: CollectionGoal = { ...makeSpec({ kind, series, character, type }), pinnedAt: new Date().toISOString() };
      void commit([...goals, goal], () => goalsTable().upsert([toRow(userId, goal)], { onConflict: "user_id,goal_key", ignoreDuplicates: true }));
      return true;
    },
    [userId, goals, keys, commit]
  );

  const isPinned = useCallback((k: string) => keys.has(k), [keys]);

  return { goals, toggle, isPinned, max: MAX_GOALS };
}
