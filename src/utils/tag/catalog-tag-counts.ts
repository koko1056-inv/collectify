/**
 * カタログの絞り込み（タグから選択）に出す「タグごとのグッズ数」のきまり。
 * 通信をしない部分だけをここに置く（scripts/test-catalog-tag-counts.mjs で確かめる）。
 */

export interface CountedTag {
  id: string;
  name: string;
  category: string | null;
  content_id: string | null;
  created_at?: string;
  count: number;
}

/** catalog_tag_counts（RPC）が返す1行 */
export interface CatalogTagCountRow {
  id: string;
  name: string;
  category: string | null;
  content_id: string | null;
  created_at: string;
  item_count: number | string;
}

/** タグの中身（tags テーブルの行のうち使うところ） */
export interface TagInfo {
  id: string;
  name: string;
  category: string | null;
  content_id?: string | null;
  created_at?: string;
}

/** グッズタイプと入手方法は、作品に関係なく（0件でも）選べるようにする */
export const ALWAYS_SHOWN_CATEGORIES = ["type", "source"] as const;

/** 1回に読む行の数。PostgREST の上限（1000行）に合わせる */
export const PAGE_SIZE = 1000;

/**
 * タグの id を URL に並べるときの1回あたりの数。
 * uuid は1つ37字ほどなので、150件で 6KB 弱。URL が長すぎて 400 になるのを避ける
 */
export const ID_CHUNK = 150;

/** 多い順。同じ数なら名前順（並びが読み込みのたびに揺れないように） */
export function sortTagsByCount<T extends { count: number; name: string }>(tags: T[]): T[] {
  return [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));
}

/** RPC の行を画面で使う形にする（bigint は文字列で返ることがあるので数に直す） */
export function rowsToCountedTags(rows: CatalogTagCountRow[]): CountedTag[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    content_id: r.content_id,
    created_at: r.created_at,
    count: Number(r.item_count) || 0,
  }));
}

/** item_tags の tag_id を数える（予備の読み方のとき） */
export function countTagIds(tagIds: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/** 数えた結果にタグの中身を付ける。中身が見つからない tag_id（消されたタグなど）は出さない */
export function attachTagInfo(counts: Map<string, number>, infos: TagInfo[]): CountedTag[] {
  const byId = new Map(infos.map((t) => [t.id, t]));
  const out: CountedTag[] = [];
  for (const [id, count] of counts) {
    const t = byId.get(id);
    if (!t) continue;
    out.push({ id, name: t.name, category: t.category ?? null, content_id: t.content_id ?? null, created_at: t.created_at, count });
  }
  return out;
}

/** グッズタイプ・入手方法のタグを、まだ無ければ 0件で足して、多い順に並べる */
export function mergeAlwaysShown(counted: CountedTag[], alwaysShown: TagInfo[]): CountedTag[] {
  const seen = new Set(counted.map((t) => t.id));
  const merged = [...counted];
  for (const t of alwaysShown) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    merged.push({ id: t.id, name: t.name, category: t.category ?? null, content_id: t.content_id ?? null, created_at: t.created_at, count: 0 });
  }
  return sortTagsByCount(merged);
}

/** 先頭ページで分かった総数から、残りのページの開始位置を出す */
export function remainingPageOffsets(total: number, pageSize = PAGE_SIZE): number[] {
  const offsets: number[] = [];
  for (let from = pageSize; from < total; from += pageSize) offsets.push(from);
  return offsets;
}

/** 配列を決まった数ずつに分ける */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * RPC がまだ本番に無い（マイグレーション前）ことを表すエラーか。
 * そのときだけ予備の読み方に切り替える（時間切れなどは、そのまま失敗として出す）
 */
export function isMissingRpcError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; status?: unknown; message?: unknown };
  if (e.code === "PGRST202" || e.code === "42883") return true;
  if (e.status === 404) return true;
  return typeof e.message === "string" && /could not find the function/i.test(e.message);
}
