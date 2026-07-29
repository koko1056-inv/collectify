import { Tag } from "@/types";

/**
 * 商品名などから、登録済みのタグ（キャラクター / グッズタイプ / シリーズ）を推測する。
 *
 * AIの画像解析はキャラクター名や商品カテゴリを返しているのに、
 * これまでは3つのプルダウンが必ず「選択してください」のままだった。
 * 手入力の場合も、商品名に「アクリルスタンド」と書いてあるのに
 * グッズタイプを毎回選び直す必要があった。
 *
 * 実在するタグ名にしか一致させないので、
 * プルダウンに無い値が入って選択が壊れることはない。
 * 迷ったら何も返さない（間違った値を入れるより、空のほうがまし）。
 */

export interface TagSuggestion {
  character: string | null;
  type: string | null;
  series: string | null;
}

interface SuggestInput {
  /** 商品名 */
  title?: string | null;
  /** 商品説明（あれば手掛かりに使う） */
  description?: string | null;
  /** AIが返したキャラクター名 */
  characterName?: string | null;
  /** AIが返した商品カテゴリ（「アクリルスタンド」など） */
  category?: string | null;
  /** 選択肢として使えるタグ一覧 */
  tags: Tag[];
}

/** 全角・半角や大文字小文字の揺れを吸収する */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 全角スペース(U+3000)は文字クラスに直接書くと lint に怒られるのでエスケープで書く
    .replace(/[\s\u3000・･,、。()（）【】［］[\]]/g, "");
}

/**
 * 候補の中から haystack に含まれるものを探す。
 * 「アクリルキーホルダー」と「キーホルダー」が両方あるときに
 * 短いほうを拾わないよう、長い名前を優先する。
 */
function findLongestMatch(haystack: string, candidates: Tag[]): string | null {
  const h = normalize(haystack);
  if (!h) return null;

  let best: string | null = null;
  let bestLen = 0;
  for (const tag of candidates) {
    const name = tag.name?.trim();
    if (!name) continue;
    const n = normalize(name);
    // 1文字のタグは何にでも当たってしまうので対象外
    if (n.length < 2) continue;
    if (h.includes(n) && n.length > bestLen) {
      best = name;
      bestLen = n.length;
    }
  }
  return best;
}

/** 名前が完全に一致するタグを探す（AIが返した名前をそのまま使えるか確認する） */
function findExact(name: string | null | undefined, candidates: Tag[]): string | null {
  if (!name?.trim()) return null;
  const n = normalize(name);
  const hit = candidates.find((t) => t.name && normalize(t.name) === n);
  return hit?.name ?? null;
}

export function suggestTags({
  title,
  description,
  characterName,
  category,
  tags,
}: SuggestInput): TagSuggestion {
  const byCategory = (c: string) => tags.filter((t) => t.category === c);
  const characters = byCategory("character");
  const types = byCategory("type");
  const seriesList = byCategory("series");

  // 商品名を主に見る。説明文はノイズが多いので、タイプの判定にだけ足す。
  const titleText = title ?? "";
  const typeText = `${titleText} ${category ?? ""} ${description ?? ""}`;

  return {
    // AIが返した名前が登録済みならそれを使い、無ければ商品名から拾う
    character: findExact(characterName, characters) ?? findLongestMatch(titleText, characters),
    type: findExact(category, types) ?? findLongestMatch(typeText, types),
    series: findLongestMatch(titleText, seriesList),
  };
}

/**
 * まだ選ばれていない項目にだけ推測値を入れる。
 * 利用者が自分で選んだものを、あとから上書きしないための決まり。
 */
export function fillEmptyTags(
  current: TagSuggestion,
  suggestion: TagSuggestion
): { next: TagSuggestion; filledCount: number } {
  const next: TagSuggestion = { ...current };
  let filledCount = 0;
  (["character", "type", "series"] as const).forEach((key) => {
    if (!current[key] && suggestion[key]) {
      next[key] = suggestion[key];
      filledCount += 1;
    }
  });
  return { next, filledCount };
}
