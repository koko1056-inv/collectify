// 運営向け「あなたのこと」集計（public.profile_private_aggregate()）の受け取りと、小さい数の保護。
//
// 集計と保護の本体は DB 側（supabase/migrations/20261101130000_profile_private_aggregate.sql）。
// ここでは返ってきた jsonb を画面用に整えつつ、念のため同じルールでもう一度確かめる
// （DB 側の取り違えがあっても、5 未満の数を画面に出さない）。
//
// React も Supabase も触らない純粋な関数だけにしてある（scripts/test-profile-extras-aggregate.mjs から直接読む）。

import {
  AGE_RANGES,
  GENDERS,
  GOODS_TYPES,
  MONTHLY_BUDGETS,
  OSHI_YEARS,
  PREFECTURES,
  TRADE_FREQUENCIES,
} from "./profileExtras.ts";

/** これより少ない人数は個別に出さない */
export const SMALL_CELL_K = 5;

export const AGGREGATE_FIELDS = [
  "gender",
  "age_range",
  "prefecture",
  "oshi_years",
  "monthly_budget",
  "goods_types",
  "trade_frequency",
] as const;
export type AggregateField = (typeof AGGREGATE_FIELDS)[number];

/** 項目ごとの選択肢（画面の並び順。都道府県は北から） */
export const AGGREGATE_OPTIONS: Record<AggregateField, readonly string[]> = {
  gender: GENDERS,
  age_range: AGE_RANGES,
  prefecture: PREFECTURES.map((p) => p.code),
  oshi_years: OSHI_YEARS,
  monthly_budget: MONTHLY_BUDGETS,
  goods_types: GOODS_TYPES,
  trade_frequency: TRADE_FREQUENCIES,
};

export interface AggregateBucket {
  value: string;
  count: number;
}

export interface SuppressedBuckets {
  buckets: AggregateBucket[];
  /** 5 未満の選択肢をまとめた人数（まとめが無い・伏せたときは null） */
  other: number | null;
}

/**
 * 1つ選びの小さい数の保護。DB の profile_private_suppress_single と同じ手順。
 *   - k 以上の選択肢だけ個別に出し、k 未満はまとめる
 *   - まとめが 1〜(k-1) だと「答えた人 − 出ている合計」で逆算できるので、
 *     出ている中で一番少ないものから順にまとめへ移す（二次秘匿）
 *   - 合計がそもそも k 未満なら、まとめも出さない
 */
export function suppressSingleChoice(counts: Record<string, number>, k = SMALL_CELL_K): SuppressedBuckets {
  // DB と同じく「多い順、同数なら値の文字順」に並べる
  const sorted = Object.entries(counts)
    .filter(([, n]) => Number.isInteger(n) && n > 0)
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0));
  let shown = sorted.filter(([, n]) => n >= k).length;
  let other = sorted.slice(shown).reduce((s, [, n]) => s + n, 0);
  while (other > 0 && other < k && shown > 0) {
    other += sorted[shown - 1][1];
    shown -= 1;
  }
  return {
    buckets: sorted.slice(0, shown).map(([value, count]) => ({ value, count })),
    other: other >= k ? other : null,
  };
}

export interface AggregateFieldView {
  field: AggregateField;
  /** 伏せた（答えた人が 5 未満・回答者が 5 未満） */
  suppressed: boolean;
  /** 答えた人（NULL 以外／よく買うグッズは1つ以上）。伏せたときは null */
  answered: number | null;
  /** 答えた人 ÷ 対象ユーザー数 */
  answeredRate: number | null;
  /** 選択肢の並び順。share = 人数 ÷ 答えた人 */
  buckets: (AggregateBucket & { share: number | null })[];
  other: { count: number; share: number | null } | null;
  /** 5 未満のものがあり、まとめても 5 未満なので出していない */
  otherHidden: boolean;
}

export interface AggregateView {
  k: number;
  generatedAt: string | null;
  /** 対象ユーザーが 5 未満で、何も出していない */
  suppressed: boolean;
  targetUsers: number | null;
  respondents: number | null;
  respondentRate: number | null;
  anyAnswered: number | null;
  anyAnsweredRate: number | null;
  fields: AggregateFieldView[];
}

/** k 以上の整数だけ通す（それ以外は「5未満のため非表示」と同じ扱い） */
function safeCount(v: unknown, k: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= k ? v : null;
}

function ratio(n: number | null, d: number | null): number | null {
  return n !== null && d !== null && d > 0 ? n / d : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function suppressedField(field: AggregateField): AggregateFieldView {
  return { field, suppressed: true, answered: null, answeredRate: null, buckets: [], other: null, otherHidden: false };
}

/**
 * profile_private_aggregate() の戻り値を画面用に整える。形が違うときは null。
 * 5 未満の数（や知らない選択肢）が混じっていても、表示には出さない。
 */
export function toAggregateView(raw: unknown): AggregateView | null {
  if (!isRecord(raw)) return null;
  const k = typeof raw.k === "number" && Number.isInteger(raw.k) && raw.k >= SMALL_CELL_K ? raw.k : SMALL_CELL_K;
  const generatedAt = typeof raw.generated_at === "string" ? raw.generated_at : null;
  const targetUsers = safeCount(raw.target_users, k);

  if (raw.suppressed === true || targetUsers === null) {
    return {
      k,
      generatedAt,
      suppressed: true,
      targetUsers: null,
      respondents: null,
      respondentRate: null,
      anyAnswered: null,
      anyAnsweredRate: null,
      fields: AGGREGATE_FIELDS.map(suppressedField),
    };
  }

  const respondents = safeCount(raw.respondents, k);
  const anyAnswered = respondents === null ? null : safeCount(raw.any_answered, k);
  const rawFields = isRecord(raw.fields) ? raw.fields : {};

  const fields = AGGREGATE_FIELDS.map((field): AggregateFieldView => {
    const f = rawFields[field];
    if (respondents === null || !isRecord(f) || f.suppressed === true) return suppressedField(field);
    const answered = safeCount(f.answered, k);
    if (answered === null) return suppressedField(field);

    const options = AGGREGATE_OPTIONS[field];
    const byValue = new Map<string, number>();
    let dropped = false;
    for (const b of Array.isArray(f.buckets) ? f.buckets : []) {
      if (!isRecord(b) || typeof b.value !== "string" || !options.includes(b.value)) continue;
      const n = safeCount(b.count, k);
      if (n === null) {
        // DB 側で保護しきれていない数。出さずに「5未満のため非表示」へ
        dropped = true;
        continue;
      }
      byValue.set(b.value, n);
    }
    const otherCount = safeCount(f.other, k);
    const buckets = options
      .filter((v) => byValue.has(v))
      .map((value) => {
        const count = byValue.get(value)!;
        return { value, count, share: ratio(count, answered) };
      });
    // 都道府県は選択肢が多いので多い順（同数なら北から）。ほかは選択肢の並び順
    if (field === "prefecture") buckets.sort((a, b) => b.count - a.count);
    return {
      field,
      suppressed: false,
      answered,
      answeredRate: ratio(answered, targetUsers),
      buckets,
      other: otherCount === null ? null : { count: otherCount, share: ratio(otherCount, answered) },
      otherHidden: (f.other_hidden === true || dropped || (f.other !== null && f.other !== undefined)) && otherCount === null,
    };
  });

  return {
    k,
    generatedAt,
    suppressed: false,
    targetUsers,
    respondents,
    respondentRate: ratio(respondents, targetUsers),
    anyAnswered,
    anyAnsweredRate: ratio(anyAnswered, targetUsers),
    fields,
  };
}

/** 0.4567 → "45.7%"（null は "—"） */
export function formatRate(r: number | null): string {
  return r === null ? "—" : `${(Math.round(r * 1000) / 10).toFixed(1)}%`;
}
