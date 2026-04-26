/**
 * コレクション → AI Studio へ素材アイテムを引き継ぐ仕組み
 *
 * 例:
 *  - コレクションで複数選択 → 「AIで使う」 → /my-room?tab=studio
 *  - AiRoomCreateWizard が open 時に consumePendingItems() で取り出して初期選択にセット
 */

const STORAGE_KEY = "ai-studio:pending-items";

export interface PendingAiItem {
  id: string;
  title: string;
  image: string;
}

/** AI Studio に送る素材を保存（複数選択した user_items を渡す想定） */
export function setPendingAiItems(items: PendingAiItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ items, ts: Date.now() }));
  } catch {
    // sessionStorage が使えない環境は無視
  }
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

/** 削除のみ（モーダル close時のクリーンアップ用） */
export function clearPendingAiItems() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
