/**
 * カタログのグッズへの申請（削除申請・修正申請・重複の報告）で使う、画面に依存しない処理。
 *  - 修正申請の下書きから「変えてほしい項目だけ」を取り出す（normalizeProposedChange）
 *  - いまの値と申請された値の差分を並べる（buildRequestDiff。管理画面の確認・申請の状況で使う）
 *  - DB のエラー文字列を、画面に出す文言のキーに寄せる（requestErrorKey）
 *
 * DB 側の検証（supabase/migrations/20261027210000_catalog_item_requests.sql の catalog_item_requests_before_insert）と
 * 同じ決まりにそろえてある。ここで弾いておけば、送ってから失敗することはほぼ無い。
 * npm run test:catalog-item-requests で確認する。
 */

export type CatalogItemRequestKind = "delete" | "edit" | "duplicate";
export type CatalogItemRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type DeleteReason = "duplicate" | "not_goods" | "unofficial" | "wrong_info" | "other";

export const DELETE_REASONS: DeleteReason[] = ["duplicate", "not_goods", "unofficial", "wrong_info", "other"];

/** 修正申請で変えられる項目（DB の proposed のキーと同じ） */
export interface ProposedChange {
  title?: string;
  content_name?: string;
  character_tag_ids?: string[];
  type_tag_id?: string;
  release_date?: string;
  price?: string;
  image?: string;
}

export type ProposedField = keyof ProposedChange;

/** 差分の並び順（画面に出す順） */
export const PROPOSED_FIELDS: ProposedField[] = [
  "title",
  "content_name",
  "character_tag_ids",
  "type_tag_id",
  "release_date",
  "price",
  "image",
];

/** いまのグッズの値（比べる元） */
export interface CurrentItemValues {
  title: string;
  content_name: string | null;
  character_tag_ids: string[];
  type_tag_id: string | null;
  release_date: string | null;
  price: string | null;
  image: string | null;
}

/** 修正申請の下書き（画面の入力欄そのまま。空欄は「変えない」） */
export interface EditDraft {
  title?: string;
  content_name?: string | null;
  character_tag_ids?: string[] | null;
  type_tag_id?: string | null;
  release_date?: string;
  price?: string;
  image?: string;
}

export const TITLE_MAX = 200;
export const PRICE_MAX = 50;
export const NOTE_MAX = 500;
export const IMAGE_MAX = 1000;
export const CHARACTERS_MAX = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const URL_RE = /^https?:\/\/\S+$/i;

/** 実在する日付か（2026-02-30 のようなものは弾く） */
export function isValidDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidImageUrl(value: string): boolean {
  return value.length <= IMAGE_MAX && URL_RE.test(value);
}

const sameSet = (a: string[], b: string[]) => {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
};

export type DraftError = "title" | "price" | "release_date" | "image" | "character_tag_ids" | "type_tag_id" | "empty";

/**
 * 下書きから、いまの値と違う項目だけを取り出す。
 * 文字は前後の空白を外し、空欄は「変えない」とみなす（名前・発売日・画像を空にする申請はできない。DB でも必須の欄）。
 * キャラは「選び直した組み合わせ」が今と違うときだけ入れる（並び順は問わない）。
 * 戻り値の errors が空でなければ送れない。changes が空なら "empty"。
 */
export function normalizeProposedChange(
  current: CurrentItemValues,
  draft: EditDraft
): { changes: ProposedChange; errors: DraftError[] } {
  const changes: ProposedChange = {};
  const errors: DraftError[] = [];

  const title = draft.title?.trim();
  if (title !== undefined && title !== "" && title !== current.title.trim()) {
    if (title.length > TITLE_MAX) errors.push("title");
    else changes.title = title;
  }

  const contentName = draft.content_name?.trim();
  if (contentName && contentName !== (current.content_name ?? "")) {
    changes.content_name = contentName;
  }

  if (Array.isArray(draft.character_tag_ids)) {
    const ids = [...new Set(draft.character_tag_ids)];
    if (!sameSet(ids, current.character_tag_ids)) {
      if (ids.length > CHARACTERS_MAX || ids.some((id) => !UUID_RE.test(id))) errors.push("character_tag_ids");
      else changes.character_tag_ids = ids;
    }
  }

  if (draft.type_tag_id && draft.type_tag_id !== current.type_tag_id) {
    if (!UUID_RE.test(draft.type_tag_id)) errors.push("type_tag_id");
    else changes.type_tag_id = draft.type_tag_id;
  }

  const releaseDate = draft.release_date?.trim();
  if (releaseDate && releaseDate !== (current.release_date ?? "")) {
    if (!isValidDate(releaseDate)) errors.push("release_date");
    else changes.release_date = releaseDate;
  }

  const price = draft.price?.trim();
  if (price !== undefined && price !== "" && price !== (current.price ?? "").trim()) {
    if (price.length > PRICE_MAX) errors.push("price");
    else changes.price = price;
  }

  const image = draft.image?.trim();
  if (image && image !== (current.image ?? "")) {
    if (!isValidImageUrl(image)) errors.push("image");
    else changes.image = image;
  }

  if (errors.length === 0 && Object.keys(changes).length === 0) errors.push("empty");
  return { changes, errors };
}

export interface DiffRow {
  field: ProposedField;
  /** 表示用の文字（タグは名前に直したもの。画像は URL） */
  before: string;
  after: string;
}

/**
 * いまの値と申請された値を並べる。申請に含まれる項目だけを返す（同じ値になったものも出す＝すでに直っている、が分かる）。
 * タグの id は tagNames で名前に直す（見つからないものは id のまま）。
 */
export function buildRequestDiff(
  current: CurrentItemValues,
  proposed: ProposedChange | null | undefined,
  tagNames: Record<string, string> = {}
): DiffRow[] {
  if (!proposed) return [];
  const name = (id: string | null | undefined) => (id ? tagNames[id] ?? id : "");
  const names = (ids: string[] | null | undefined) =>
    (ids ?? [])
      .map((id) => name(id))
      .sort((a, b) => a.localeCompare(b, "ja"))
      .join("、");

  const rows: DiffRow[] = [];
  for (const field of PROPOSED_FIELDS) {
    if (!(field in proposed)) continue;
    switch (field) {
      case "title":
        rows.push({ field, before: current.title, after: proposed.title ?? "" });
        break;
      case "content_name":
        rows.push({ field, before: current.content_name ?? "", after: proposed.content_name ?? "" });
        break;
      case "character_tag_ids":
        rows.push({ field, before: names(current.character_tag_ids), after: names(proposed.character_tag_ids) });
        break;
      case "type_tag_id":
        rows.push({ field, before: name(current.type_tag_id), after: name(proposed.type_tag_id) });
        break;
      case "release_date":
        rows.push({ field, before: current.release_date ?? "", after: proposed.release_date ?? "" });
        break;
      case "price":
        rows.push({ field, before: current.price ?? "", after: proposed.price ?? "" });
        break;
      case "image":
        rows.push({ field, before: current.image ?? "", after: proposed.image ?? "" });
        break;
    }
  }
  return rows;
}

/** 申請に出てくるタグの id（名前を引くため） */
export function collectTagIds(current: CurrentItemValues, proposed: ProposedChange | null | undefined): string[] {
  const ids = new Set<string>(current.character_tag_ids);
  if (current.type_tag_id) ids.add(current.type_tag_id);
  for (const id of proposed?.character_tag_ids ?? []) ids.add(id);
  if (proposed?.type_tag_id) ids.add(proposed.type_tag_id);
  return [...ids];
}

/** item_tags(tags(...)) の形から、比べる元の値を作る */
export function currentValuesFromItem(item: {
  title: string;
  content_name: string | null;
  release_date: string | null;
  price: string | null;
  image: string | null;
  item_tags?: { tags: { id: string; category: string | null } | null }[] | null;
}): CurrentItemValues {
  const tags = (item.item_tags ?? []).map((r) => r.tags).filter((t): t is { id: string; category: string | null } => !!t);
  return {
    title: item.title,
    content_name: item.content_name,
    release_date: item.release_date,
    price: item.price,
    image: item.image,
    character_tag_ids: tags.filter((t) => t.category === "character").map((t) => t.id),
    type_tag_id: tags.find((t) => t.category === "type")?.id ?? null,
  };
}

export type RequestErrorKey = "rateLimited" | "duplicatePending" | "itemNotFound" | "invalid" | "notPending" | "mergeForbidden" | "failed";

/** DB の RAISE EXCEPTION の文字列から、画面の文言キーを選ぶ */
export function requestErrorKey(error: unknown): RequestErrorKey {
  const e = error as { message?: string; details?: string } | null;
  const message = `${e?.message ?? (error instanceof Error ? error.message : "")} ${e?.details ?? ""}`;
  if (message.includes("catalog_item_request_rate_limited")) return "rateLimited";
  if (message.includes("catalog_item_request_duplicate")) return "duplicatePending";
  if (message.includes("catalog_item_request_item_not_found")) return "itemNotFound";
  if (message.includes("catalog_item_request_not_pending")) return "notPending";
  if (message.includes("catalog_item_request_merge_failed") && message.includes("forbidden")) return "mergeForbidden";
  if (message.includes("catalog_item_request_invalid")) return "invalid";
  return "failed";
}
