import { useCallback, useEffect, useMemo, useState } from "react";
import { makeSpec, type TargetSpec } from "@/utils/collectionTargets";

/**
 * 「集めるもの」（自分で決めたコンプの目標）の読み書き。
 *
 * 作品全体の大きな分母ではなく、自分が集めたいシリーズ・キャラをピン留めして、その達成率を一番上に出すためのもの。
 * 本来は DB（collection_goals テーブル）に置くべきだが、いまは本番に適用できないので端末内（localStorage）に置く。
 * 読み書きはこのフックの中だけに閉じ込めてあるので、DB 版に移すときはここだけを差し替える
 * （戻り値の形は変えない。移すときは、端末内の目標を一度だけ DB に書き写してから消す）。
 *
 * localStorage は、プライベートブラウズや容量切れで読めない・書けないことがあるので、必ず try/catch で囲む。
 * 保存できなくても、開いている間は画面の中で目標が効くようにする。
 */

export interface CollectionGoal extends TargetSpec {
  pinnedAt: string;
}

/** 一番上に並べるので、多すぎると「目標」ではなくなる */
export const MAX_GOALS = 6;

const STORAGE_PREFIX = "collectify.collectionGoals.v1.";
/** 同じタブの別の場所（コレクション画面の複数の部品）にも変化を伝える */
const CHANGE_EVENT = "collectify:collection-goals-changed";

function storageKey(userId: string) {
  return STORAGE_PREFIX + userId;
}

function isGoal(v: unknown): v is CollectionGoal {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  return typeof g.kind === "string" && typeof g.key === "string";
}

function readGoals(userId: string | null | undefined): CollectionGoal[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // キーの作り方が変わっても重複しないよう、読み込むときに作り直す
    return parsed.filter(isGoal).map((g) => ({ ...makeSpec(g), pinnedAt: g.pinnedAt ?? new Date(0).toISOString() }));
  } catch {
    return [];
  }
}

function writeGoals(userId: string, goals: CollectionGoal[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(goals));
  } catch {
    /* 保存できなくても、この画面の中では目標として扱う */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: userId }));
  } catch {
    /* 古い環境で CustomEvent が無くても、自分の画面は state で更新される */
  }
}

export function useCollectionGoals(userId: string | null | undefined) {
  const [goals, setGoals] = useState<CollectionGoal[]>(() => readGoals(userId));

  // 利用者が変わったら読み直す。別のタブ・同じタブの別の部品での変更も拾う
  useEffect(() => {
    setGoals(readGoals(userId));
    if (!userId) return;
    const reload = (e: Event) => {
      if (e instanceof StorageEvent && e.key !== storageKey(userId)) return;
      setGoals(readGoals(userId));
    };
    window.addEventListener("storage", reload);
    window.addEventListener(CHANGE_EVENT, reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener(CHANGE_EVENT, reload);
    };
  }, [userId]);

  const keys = useMemo(() => new Set(goals.map((g) => g.key)), [goals]);

  const save = useCallback(
    (next: CollectionGoal[]) => {
      setGoals(next);
      if (userId) writeGoals(userId, next);
    },
    [userId]
  );

  /** ピン留め・解除。上限に達しているときは false を返す（呼び出し側で知らせる） */
  const toggle = useCallback(
    (spec: TargetSpec): boolean => {
      if (keys.has(spec.key)) {
        save(goals.filter((g) => g.key !== spec.key));
        return true;
      }
      if (goals.length >= MAX_GOALS) return false;
      const { kind, work, series, character, type } = spec;
      save([...goals, { ...makeSpec({ kind, work, series, character, type }), pinnedAt: new Date().toISOString() }]);
      return true;
    },
    [goals, keys, save]
  );

  const isPinned = useCallback((key: string) => keys.has(key), [keys]);

  return { goals, toggle, isPinned, max: MAX_GOALS };
}
