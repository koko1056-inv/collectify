import { arrayMove } from "@dnd-kit/sortable";

export interface SortOrderItem {
  id: string;
  sort_order: number;
}

/**
 * ドラッグで activeId を overId の位置に移したときに、activeId へ割り振る新しい sort_order を返す。
 * 動かした1件だけを、新しい前後の中間値（先頭/末尾なら ±1）に更新すれば並び替えが成立する
 * （fractional indexing）。他の行は書き換えない。
 */
export function computeDroppedSortOrder(
  items: SortOrderItem[],
  activeId: string,
  overId: string
): number | null {
  if (activeId === overId) return null;
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex === -1 || overIndex === -1) return null;

  const reordered = arrayMove(items, oldIndex, overIndex);
  const newIndex = reordered.findIndex((item) => item.id === activeId);
  const prev = reordered[newIndex - 1];
  const next = reordered[newIndex + 1];

  if (prev && next) return (prev.sort_order + next.sort_order) / 2;
  if (prev) return prev.sort_order + 1;
  if (next) return next.sort_order - 1;
  return 0;
}
