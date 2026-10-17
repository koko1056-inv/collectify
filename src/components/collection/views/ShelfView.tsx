import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl } from "@/utils/optimized-image";
import { PickedItemModal, type PickedItem } from "./PickedItemModal";

interface ShelfItem {
  id: string;
  title: string;
  image: string | null;
  user_id?: string;
  content_name?: string | null;
  official_items?: { content_name?: string | null } | null;
}

/** 棚1段の高さ（px）と、板の厚み。グッズは板の上に立てる */
const ROW = 136;
const PLANK = 16;

/**
 * 飾り棚: 作品ごとに木の棚を作り、グッズを写真立てのように立てて並べる。
 * 段の数はグッズの数と画面幅で決まる（板は背景の繰り返しで描くので、何段でも同じ見た目になる）。
 */
export function ShelfView({ items, isOwn }: { items: ShelfItem[]; isOwn: boolean }) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState<PickedItem | null>(null);

  const shelves = useMemo(() => {
    const map = new Map<string, { label: string; items: ShelfItem[] }>();
    for (const item of items) {
      const raw = (item.content_name || item.official_items?.content_name || "").trim();
      const label = raw && raw !== "なし" ? raw : "";
      const key = label.toLowerCase();
      const g = map.get(key) ?? { label, items: [] };
      g.items.push(item);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => {
      if (!a.label !== !b.label) return a.label ? -1 : 1; // 作品の無いものは最後
      return b.items.length - a.items.length;
    });
  }, [items]);

  return (
    <div className="space-y-5 [--plank-front:#a66f3e] [--plank-top:#d5a26c] [--wall:#f5ece1] [--wood-side:#8d5a2f] dark:[--plank-front:#6e4526] dark:[--plank-top:#8f6038] dark:[--wall:#29221d] dark:[--wood-side:#4f321c]">
      {shelves.map((shelf) => (
        <section key={shelf.label || "_other"} aria-label={shelf.label || t("collectionScreen.shelf.other")}>
          {/* 棚の名札（真鍮のプレート） */}
          <div className="mb-1.5 flex items-center gap-2 px-1">
            {/* eslint-disable-next-line no-restricted-syntax -- 状態の色ではなく、真鍮の名札という飾りの色 */}
            <span className="truncate rounded-md bg-gradient-to-b from-amber-200 to-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow-sm ring-1 ring-amber-500/50 dark:from-amber-300/90 dark:to-amber-500/90">
              {shelf.label || t("collectionScreen.shelf.other")}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {t("collectionScreen.shelf.count", { n: shelf.items.length })}
            </span>
          </div>

          <div
            className="overflow-hidden rounded-xl border-x-[10px] border-b-[6px] border-t-[6px] border-[color:var(--wood-side)] shadow-md"
            style={{
              backgroundColor: "var(--wall)",
              backgroundImage: `repeating-linear-gradient(to bottom,
                transparent 0px, transparent ${ROW - PLANK}px,
                var(--plank-top) ${ROW - PLANK}px, var(--plank-top) ${ROW - PLANK + 3}px,
                var(--plank-front) ${ROW - PLANK + 3}px, var(--plank-front) ${ROW - 2}px,
                rgba(0,0,0,0.18) ${ROW - 2}px, rgba(0,0,0,0.0) ${ROW}px)`,
            }}
          >
            <ul
              className="grid grid-cols-4 px-1.5 sm:grid-cols-6 md:grid-cols-8"
              style={{ gridAutoRows: `${ROW}px` }}
            >
              {shelf.items.map((item) => (
                <li key={item.id} className="flex items-end justify-center" style={{ paddingBottom: PLANK - 1 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setPicked({
                        kind: "user",
                        id: item.id,
                        title: item.title,
                        image: item.image ?? "",
                        ownerId: item.user_id,
                        isOwn,
                      })
                    }
                    aria-label={item.title}
                    className="group relative flex max-w-[88%] origin-bottom transition-transform duration-200 hover:-translate-y-1 active:scale-95"
                  >
                    {/* 写真立て（白いふち）。足元に小さな影 */}
                    <span className="block rounded-[3px] bg-white p-[3px] shadow-[0_6px_8px_-4px_rgba(0,0,0,0.45)] dark:bg-neutral-200">
                      {item.image ? (
                        <img
                          src={getOptimizedImageUrl(item.image, { width: 200 })}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="block max-h-[100px] w-auto max-w-full rounded-[2px] object-contain"
                          style={{ minWidth: 48 }}
                        />
                      ) : (
                        <span className="flex h-[88px] w-16 items-center justify-center p-1 text-center text-3xs leading-tight text-neutral-600">
                          {item.title}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <PickedItemModal picked={picked} onClose={() => setPicked(null)} />
    </div>
  );
}
