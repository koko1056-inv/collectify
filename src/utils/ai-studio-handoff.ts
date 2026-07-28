/**
 * コレクション → AI Studio へ素材アイテムを引き継ぐ仕組み
 * + 探索 → AI Studio (リミックス) への引き継ぎ
 */

const STORAGE_KEY = "ai-studio:pending-items";
const REMIX_KEY = "ai-studio:pending-remix";

export interface PendingAiItem {
  id: string;
  title: string;
  image: string;
}

/** AI Studio に送る素材を保存（複数選択した user_items を渡す想定） */
export function setPendingAiItems(items: PendingAiItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ items, ts: Date.now() }));
  } catch {}
}

/** 取り出して即削除（再利用させない）。15分以上前のデータは無効。 */
export function consumePendingAiItems(): PendingAiItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as { items: PendingAiItem[]; ts: number };
    if (!parsed?.items?.length) return [];
    if (Date.now() - parsed.ts > 15 * 60 * 1000) return [];
    return parsed.items;
  } catch {
    return [];
  }
}

export function clearPendingAiItems() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ============= リミックス用 =============

export type RemixMode = "remix" | "style"; // 完全リミックス / スタイルだけ継承

export interface PendingRemix {
  mode: RemixMode;
  parentRoomId: string;
  stylePrompt?: string | null;
  stylePreset?: string | null;
  customPrompt?: string | null;
  visualStyle?: string | null;
  /** スタイル継承時は素材は引き継がない、リミックス時は引き継ぐ */
  items?: PendingAiItem[];
  parentImageUrl?: string;
  parentTitle?: string | null;
}

export function setPendingRemix(payload: PendingRemix) {
  try {
    sessionStorage.setItem(
      REMIX_KEY,
      JSON.stringify({ ...payload, ts: Date.now() })
    );
  } catch {}
}

export function consumePendingRemix(): PendingRemix | null {
  try {
    const raw = sessionStorage.getItem(REMIX_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(REMIX_KEY);
    const parsed = JSON.parse(raw) as PendingRemix & { ts: number };
    if (!parsed?.parentRoomId) return null;
    if (Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingRemix() {
  try {
    sessionStorage.removeItem(REMIX_KEY);
  } catch {}
}

// ============= 探索 → アバタースタジオ =============

const AVATAR_PROMPT_KEY = "ai-studio:pending-avatar-prompt";

export interface PendingAvatarPrompt {
  prompt: string;
  parentAvatarId: string;
  parentImageUrl?: string;
  parentName?: string | null;
}

/** 探索で見つけたアバターのプロンプトを、アバタースタジオに引き継ぐ */
export function setPendingAvatarPrompt(payload: PendingAvatarPrompt) {
  try {
    sessionStorage.setItem(
      AVATAR_PROMPT_KEY,
      JSON.stringify({ ...payload, ts: Date.now() })
    );
  } catch {
    // sessionStorage が使えない環境では引き継ぎを諦める（本流は止めない）
  }
}

/** 取り出して即削除（再利用させない）。15分以上前のデータは無効。 */
export function consumePendingAvatarPrompt(): PendingAvatarPrompt | null {
  try {
    const raw = sessionStorage.getItem(AVATAR_PROMPT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(AVATAR_PROMPT_KEY);
    const parsed = JSON.parse(raw) as PendingAvatarPrompt & { ts: number };
    if (!parsed?.prompt) return null;
    if (Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 消費せずに存在だけ確認する（スタジオを自動で開くかの判定用） */
export function hasPendingAvatarPrompt(): boolean {
  try {
    return !!sessionStorage.getItem(AVATAR_PROMPT_KEY);
  } catch {
    return false;
  }
}

// ============= 画像検索 → グッズ登録 =============

const ITEM_PHOTO_KEY = "add-item:pending-photo";

export interface PendingItemPhoto {
  /** 画像の data URL。sessionStorage に載せるため、大きすぎる場合は保存できない。 */
  dataUrl: string;
  /** 画像検索で得られた推定名（あれば初期値に使う） */
  guessedTitle?: string | null;
}

/**
 * 撮った写真をグッズ登録フローへ引き継ぐ。
 *
 * @returns 保存できたら true。sessionStorage の容量を超えた場合は false を返すので、
 *          呼び出し側は「引き継ぎなしで遷移する」にフォールバックできる。
 */
export function setPendingItemPhoto(payload: PendingItemPhoto): boolean {
  try {
    sessionStorage.setItem(ITEM_PHOTO_KEY, JSON.stringify({ ...payload, ts: Date.now() }));
    return true;
  } catch {
    // 画像が大きすぎて入らないことがある。その場合は引き継がない。
    return false;
  }
}

/** 取り出して即削除（再利用させない）。15分以上前のデータは無効。 */
export function consumePendingItemPhoto(): PendingItemPhoto | null {
  try {
    const raw = sessionStorage.getItem(ITEM_PHOTO_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ITEM_PHOTO_KEY);
    const parsed = JSON.parse(raw) as PendingItemPhoto & { ts: number };
    if (!parsed?.dataUrl) return null;
    if (Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** data URL を File に戻す（アップロードに使う） */
export function dataUrlToFile(dataUrl: string, filename = "photo.jpg"): File | null {
  try {
    const [head, body] = dataUrl.split(",");
    const mime = /:(.*?);/.exec(head)?.[1] || "image/jpeg";
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}
