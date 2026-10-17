import { useCallback, useState } from "react";

/**
 * 「持ってる」の並べ方。grid = いままでの3列の一覧。
 * zukan = シリーズごとの図鑑（まだのものはシルエット）/ binder = トレカのバインダー / shelf = 作品ごとの飾り棚。
 * 推し宇宙は全画面で開くので、ここには含めない（切り替えのメニューから開く）
 */
export type CollectionDisplay = "grid" | "zukan" | "binder" | "shelf";

const KEY = "collection_display";
const ALL: CollectionDisplay[] = ["grid", "zukan", "binder", "shelf"];

function read(): CollectionDisplay {
  try {
    const v = localStorage.getItem(KEY);
    return ALL.includes(v as CollectionDisplay) ? (v as CollectionDisplay) : "grid";
  } catch {
    return "grid";
  }
}

/** 選んだ並べ方は、次に開いたときも同じにする（この端末だけ） */
export function useCollectionDisplay() {
  const [display, setDisplayState] = useState<CollectionDisplay>(read);
  const setDisplay = useCallback((next: CollectionDisplay) => {
    setDisplayState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* 保存できなくても、この画面では切り替える */
    }
  }, []);
  return [display, setDisplay] as const;
}
