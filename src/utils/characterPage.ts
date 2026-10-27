/**
 * キャラページ（/character/:tagId）と、カタログカードの「ほしい」ボタンの小さな計算。
 *
 * scripts/test-character-page.mjs から直接 import するので、@/ のエイリアスや React を使わないこと。
 */
import { computeCompletionRows, type CompletionRow, type ZukanItemLike } from "./zukan.ts";

/** キャラページの URL。 */
export function characterPath(tagId: string): string {
  return `/character/${encodeURIComponent(tagId)}`;
}

/** 作品のカタログ（/search で作品を選んだ状態）への URL。 */
export function contentCatalogPath(content: string): string {
  return `/search?content=${encodeURIComponent(content)}`;
}

/** item_tags に id まで入った形（useOfficialItems の SELECT と同じ）。 */
export interface TagRowLike {
  tags?: { id?: string | null; name?: string | null; category?: string | null } | null;
}
export interface ItemWithTagIds {
  id: string;
  item_tags?: TagRowLike[] | null;
}

/**
 * /search のキャラチップ（名前で選ぶ）から、キャラページの tag id を選ぶ。
 * 同じ作品に同名のキャラタグが複数あることがあるので、いちばん多くのグッズに付いている id にする
 * （キャラページ側で同名タグはまとめるので、どれを選んでも同じページになる）。見つからなければ null。
 */
export function pickCharacterTagId(items: readonly ItemWithTagIds[], name: string | null | undefined): string | null {
  const want = (name ?? "").trim();
  if (!want) return null;
  const counts = new Map<string, number>();
  for (const item of items) {
    const seen = new Set<string>();
    for (const row of item.item_tags ?? []) {
      const tag = row.tags;
      if (!tag?.id || tag.category !== "character" || (tag.name ?? "").trim() !== want) continue;
      if (seen.has(tag.id)) continue;
      seen.add(tag.id);
      counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN || (n === bestN && best !== null && id < best)) {
      best = id;
      bestN = n;
    }
  }
  return best;
}

export interface CharacterTagLike {
  id: string;
  name: string;
  category?: string | null;
  content_id?: string | null;
}

/**
 * 同じ作品（content_id）で同じ名前のキャラタグの id（自分を含む）。RPC の char_tags と同じ考え方。
 * 作品が違えば同じ名前でも別のキャラ。
 */
export function sameCharacterTagIds(base: CharacterTagLike, candidates: readonly CharacterTagLike[]): string[] {
  const out = new Set<string>([base.id]);
  for (const t of candidates) {
    if (t.category && t.category !== "character") continue;
    if (t.name !== base.name) continue;
    if ((t.content_id ?? null) !== (base.content_id ?? null)) continue;
    out.add(t.id);
  }
  return [...out];
}

/**
 * キャラページの所持率を手元のグッズから数える（RPC get_character_completion が無い・失敗したときの代わり）。
 * 形は RPC と同じ: work 1 行（label はキャラ名）と series / type の内訳。キャラの内訳は出さない（全部同じキャラなので）。
 */
export function characterCompletionRows(
  items: ZukanItemLike[],
  ownedIds: ReadonlySet<string> | null | undefined,
  characterName: string
): CompletionRow[] {
  return computeCompletionRows(items, ownedIds, characterName).filter((r) => r.kind !== "character");
}

// ---------------------------------------------------------------------------
// 「ほしい」ボタン
// ---------------------------------------------------------------------------

/**
 * カードの「ほしい」ボタンの見え方。
 *  - hidden: 持っている（持っているものを「ほしい」に入れる意味がない）
 *  - guest:  ログインしていない（押すと登録のおすすめ）
 *  - on / off: ほしいものに入っている / いない
 *  - loading: 自分のほしいもの一覧をまだ読んでいる（押せるが、状態は未確定）
 */
export type WishButtonState = "hidden" | "guest" | "on" | "off" | "loading";

export function wishButtonState(input: {
  isGuest: boolean;
  owned: boolean;
  wishedIds: ReadonlySet<string> | null | undefined;
  id: string;
}): WishButtonState {
  if (input.isGuest) return "guest";
  if (input.owned) return "hidden";
  if (!input.wishedIds) return "loading";
  return input.wishedIds.has(input.id) ? "on" : "off";
}

/** Set を壊さずに 1 件だけ足す・外す（React Query のキャッシュを楽観的に書き換えるため）。 */
export function withWish(set: ReadonlySet<string> | null | undefined, id: string, on: boolean): Set<string> {
  const next = new Set(set ?? []);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}
