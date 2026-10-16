/**
 * コンプの「的（まと）」を組み立てる、画面に依存しない計算。
 *
 * 以前のコンプ進捗は作品全体（content_name）が分母で、ちいかわなら 10,418 件。
 * 何個登録しても数字が動かず「コンプ率が上がらない絶望」になっていた。
 * ここでは、持っているグッズから「小さく区切れるまとまり」を拾い出す。
 *  - シリーズ（series タグ）            例: ちいかわカードダス 3/5
 *  - キャラ（character タグ）           例: ハチワレ 12/2913（大きいので後ろに回る）
 *  - キャラ×種類（character × type）   例: ハチワレのアクリルスタンド 3/38
 *  - シリーズ×キャラ                     例: 肩ズンFig.（日向） 1/2
 *  - 作品（content_name）               大きいので折りたたんで出す
 * 並びは「あと少しでコンプ」（残りが少ない・率が高い）を上にする。
 *
 * 分母（カタログ全体での数）は、サーバーの RPC（get_collection_targets）があればそれを、
 * 無ければ useCollectionTargets が必要な分だけ数えて埋める。ここは分子（持っている数）と候補選びだけ。
 */

export type TargetKind = "work" | "series" | "character" | "character_type" | "series_character";

export interface TargetSpec {
  kind: TargetKind;
  /** 種類と名前（小文字）から作る一意のキー。目標の保存にも使う */
  key: string;
  work?: string;
  series?: string;
  character?: string;
  type?: string;
}

export interface MissingGoods {
  id: string;
  title: string;
  image: string | null;
}

export interface CollectionTarget extends TargetSpec {
  owned: number;
  /** カタログ全体での数。まだ数えていない・数えられなかったときは null */
  total: number | null;
  cover: string | null;
  /** 持っている公式グッズのID（足りないものを出すときに差を取る） */
  ownedIds: string[];
  /** 足りないグッズ（あと少しのときだけ埋まる） */
  missing?: MissingGoods[];
}

/** 進捗 RPC（get_collection_progress）の1行。作品名とシリーズタグが混ざって返る */
export interface ProgressRow {
  series_label: string;
  owned: number;
  total: number;
  cover_image: string | null;
}

/** コレクション画面で読んでいる user_items の形（必要なところだけ） */
export interface OwnedItemLike {
  official_item_id?: string | null;
  content_name?: string | null;
  image?: string | null;
  official_items?: {
    content_name?: string | null;
    item_tags?: { tags?: { name?: string | null; category?: string | null } | null }[] | null;
  } | null;
}

const PLACEHOLDERS = new Set(["", "なし", "none", "n/a"]);
const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return PLACEHOLDERS.has(s.toLowerCase()) ? null : s;
};
const low = (v: string) => v.trim().toLowerCase();

export function targetKey(spec: Omit<TargetSpec, "key">): string {
  const parts = [spec.work, spec.series, spec.character, spec.type].filter((v): v is string => !!v).map(low);
  return `${spec.kind}:${parts.join("|")}`;
}

export function makeSpec(spec: Omit<TargetSpec, "key">): TargetSpec {
  return { ...spec, key: targetKey(spec) };
}

/** 持っているグッズ1件から、作品・シリーズ・キャラ・種類を取り出す（公式グッズのタグだけを見る） */
function facetsOf(item: OwnedItemLike) {
  const work = clean(item.official_items?.content_name) ?? clean(item.content_name);
  const series: string[] = [];
  const character: string[] = [];
  const type: string[] = [];
  for (const row of item.official_items?.item_tags ?? []) {
    const name = clean(row.tags?.name);
    if (!name) continue;
    const c = row.tags?.category;
    const list = c === "series" ? series : c === "character" ? character : c === "type" ? type : null;
    if (list && !list.some((x) => low(x) === low(name))) list.push(name);
  }
  return { work, series, character, type };
}

interface Bucket {
  spec: TargetSpec;
  ids: Set<string>;
  cover: string | null;
}

/** 候補を選ぶ数。それぞれ1件ずつカタログ全体の数を数えに行くので、多くしすぎない */
export const CANDIDATE_LIMITS = { character: 6, character_type: 8, series_character: 4 } as const;

/**
 * 持っているグッズから、的の候補（分子つき）を作る。分母は入っていない（total: null）。
 * progress（既存の RPC）の作品・シリーズはそのまま分母つきで使う。
 * pinned（目標）に入っているものは、上位でなくても必ず候補に入れる。
 */
export function buildTargets(
  items: OwnedItemLike[],
  progress: ProgressRow[],
  pinned: TargetSpec[] = [],
  options: { characters?: boolean } = {}
): CollectionTarget[] {
  const withCharacters = options.characters ?? true;
  const buckets = new Map<string, Bucket>();
  const workKeys = new Set<string>();
  const add = (spec: TargetSpec, id: string, image: string | null) => {
    let b = buckets.get(spec.key);
    if (!b) {
      b = { spec, ids: new Set(), cover: null };
      buckets.set(spec.key, b);
    }
    b.ids.add(id);
    // 一覧は新しい順なので、最初に入った写真が最新
    if (!b.cover && image) b.cover = image;
  };

  for (const item of items) {
    const id = item.official_item_id;
    const f = facetsOf(item);
    if (f.work) workKeys.add(low(f.work));
    if (!id) continue;
    const image = item.image ?? null;
    for (const s of f.series) add(makeSpec({ kind: "series", series: s }), id, image);
    if (!withCharacters) continue;
    for (const c of f.character) {
      add(makeSpec({ kind: "character", character: c }), id, image);
      for (const ty of f.type) add(makeSpec({ kind: "character_type", character: c, type: ty }), id, image);
      for (const s of f.series) add(makeSpec({ kind: "series_character", series: s, character: c }), id, image);
    }
  }

  const out: CollectionTarget[] = [];
  const seen = new Set<string>();

  // 作品・シリーズは既存の進捗 RPC の数字（分母つき）を使う。作品名と同じ名前なら作品として扱う
  for (const p of progress) {
    const isWork = workKeys.has(low(p.series_label));
    const spec = isWork
      ? makeSpec({ kind: "work", work: p.series_label })
      : makeSpec({ kind: "series", series: p.series_label });
    if (seen.has(spec.key)) continue;
    seen.add(spec.key);
    const b = buckets.get(makeSpec({ kind: "series", series: p.series_label }).key);
    out.push({
      ...spec,
      owned: p.owned,
      total: Math.max(p.total, p.owned),
      cover: p.cover_image ?? b?.cover ?? null,
      ownedIds: b ? [...b.ids] : [],
    });
  }

  // キャラ系は、持っている数の多いものから上位だけ（それぞれ数えに行くので）
  const pick = (kind: Exclude<TargetKind, "work" | "series">) =>
    [...buckets.values()]
      .filter((b) => b.spec.kind === kind)
      .sort((a, b) => b.ids.size - a.ids.size || a.spec.key.localeCompare(b.spec.key))
      .slice(0, CANDIDATE_LIMITS[kind]);
  const candidates = withCharacters ? [...pick("character_type"), ...pick("series_character"), ...pick("character")] : [];
  for (const b of candidates) {
    if (seen.has(b.spec.key)) continue;
    seen.add(b.spec.key);
    out.push({ ...b.spec, owned: b.ids.size, total: null, cover: b.cover, ownedIds: [...b.ids] });
  }

  // 目標に入っているもの（持っている数が 0 になっていても出す）
  for (const spec of pinned) {
    if (seen.has(spec.key)) continue;
    seen.add(spec.key);
    const b = buckets.get(spec.key);
    out.push({ ...spec, owned: b?.ids.size ?? 0, total: null, cover: b?.cover ?? null, ownedIds: b ? [...b.ids] : [] });
  }
  return out;
}

export function remaining(t: Pick<CollectionTarget, "owned" | "total">): number | null {
  return t.total == null ? null : Math.max(0, t.total - t.owned);
}

export function targetPercent(t: Pick<CollectionTarget, "owned" | "total">): number {
  if (!t.total || t.total <= 0) return 0;
  return Math.min(100, Math.round((t.owned / t.total) * 100));
}

export function isTargetComplete(t: Pick<CollectionTarget, "owned" | "total">): boolean {
  return t.total != null && t.total >= 2 && t.owned >= t.total;
}

/**
 * 「あと少しでコンプ」を上に並べる。
 * 未コンプ → 残りの少ない順 → 率の高い順 → 分母の小さい順。コンプ済みは後ろ（達成の記録として残す）。
 * 分母が 1 のもの（1個しかないシリーズ）は、コンプと言うほどでもないので出さない。
 */
export function rankTargets(targets: CollectionTarget[]): CollectionTarget[] {
  return targets
    .filter((t) => t.total != null && t.total >= 2)
    .sort((a, b) => {
      const ca = isTargetComplete(a) ? 1 : 0;
      const cb = isTargetComplete(b) ? 1 : 0;
      if (ca !== cb) return ca - cb;
      return (
        (remaining(a) ?? 0) - (remaining(b) ?? 0) ||
        targetPercent(b) - targetPercent(a) ||
        (a.total ?? 0) - (b.total ?? 0) ||
        a.key.localeCompare(b.key)
      );
    });
}

/**
 * 同じ中身になってしまう的を1つにまとめる。
 * 例: シリーズの中身が全部ハチワレなら「シリーズ×キャラ」はシリーズと同じ数になるので、シリーズだけ残す。
 * キャラ×種類がキャラ全体と同じ数なら、キャラだけ残す。
 */
export function dedupeTargets(targets: CollectionTarget[]): CollectionTarget[] {
  const byKey = new Map(targets.map((t) => [t.key, t]));
  const sameCount = (a: CollectionTarget, b: CollectionTarget) => a.total === b.total && a.owned === b.owned;
  return targets.filter((t) => {
    if (t.total == null) return true;
    let parent: CollectionTarget | undefined;
    if (t.kind === "series_character" && t.series) parent = byKey.get(makeSpec({ kind: "series", series: t.series }).key);
    if (t.kind === "character_type" && t.character) parent = byKey.get(makeSpec({ kind: "character", character: t.character }).key);
    if (parent && sameCount(parent, t)) return false;
    // 「ちいかわのカード 1/2」と「ちいかわカードダス（ちいかわ）1/2」のように、種類がそのシリーズにしか無いと
    // 同じグッズの集まりが2枚並ぶ。同じキャラで数がそろっていたら、名前の分かりやすいシリーズ×キャラだけ残す。
    // （中身までは比べていないので、たまたま数が同じ別の集まりを1つ隠すことはありうる。見せる枚数を絞る側に倒す）
    if (t.kind === "character_type") {
      return !targets.some(
        (o) => o.kind === "series_character" && o.character && t.character && o.character.toLowerCase() === t.character.toLowerCase() && sameCount(o, t)
      );
    }
    return true;
  });
}

/** 「あと少し」で足りないものを見せる対象か（残りが少なく、分母も小さい） */
export function wantsMissing(t: CollectionTarget, maxRemaining = 2, maxTotal = 60): boolean {
  const r = remaining(t);
  return r != null && r >= 1 && r <= maxRemaining && (t.total ?? 0) <= maxTotal && t.kind !== "work";
}
