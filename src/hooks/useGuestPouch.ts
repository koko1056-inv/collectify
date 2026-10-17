import { useCallback, useState } from "react";
import type { OfficialItem } from "@/types";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import { GUEST_POUCH_MAX, readGuestPouch, toGuestItem, writeGuestPouch } from "@/utils/guestPouch";

/**
 * おためしの袋に入れる（useQuickAddGoods と同じ形。ログインしていない人の「はじめの1コレ」で使う）
 */
export function useGuestPouch() {
  const [pouch, setPouch] = useState(readGuestPouch);
  const added = new Set(pouch.owned.map((i) => i.id));
  const wished = new Set(pouch.wished.map((i) => i.id));

  const add = useCallback(async (item: OfficialItem) => {
    const cur = readGuestPouch();
    if (cur.owned.some((i) => i.id === item.id) || cur.owned.length >= GUEST_POUCH_MAX) return false;
    const next = { owned: [toGuestItem(item), ...cur.owned], wished: cur.wished.filter((i) => i.id !== item.id) };
    writeGuestPouch(next);
    setPouch(next);
    pockeCheer("added");
    return true;
  }, []);

  const wish = useCallback(async (item: OfficialItem) => {
    const cur = readGuestPouch();
    if (cur.wished.some((i) => i.id === item.id)) return;
    const next = { ...cur, wished: [toGuestItem(item), ...cur.wished] };
    writeGuestPouch(next);
    setPouch(next);
  }, []);

  return { added, wished, busyId: null as string | null, add, wish, owned: pouch.owned };
}
