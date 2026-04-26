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
