import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Move } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/utils/optimized-image";
import { Button } from "@/components/ui/button";
import { PickedItemModal, type PickedItem } from "./PickedItemModal";

const PER_PAGE = 9;

interface BinderItem {
  id: string;
  title: string;
  image: string | null;
  quantity?: number | null;
  user_id?: string;
}

/**
 * バインダー: トレカのファイルのように、1ページ 3×3 のポケットに入れて眺める。
 * スマホは1ページずつ（スワイプでめくる）、広い画面は見開き2ページ。並びは一覧の並び替えのまま。
 * 「並び替え」を押すと、ページをやめて1枚の一覧にし、長押し（またはマウスでつかむ）でドラッグして
 * 好きな順番に入れ替えられる（本人のコレクションだけ）。
 */
export function BinderView({
  items,
  isOwn,
  reorderEnabled = false,
  onEnableReorder,
  onReorderItem,
}: {
  items: BinderItem[];
  isOwn: boolean;
  /** 本人のコレクションで、並べ方が「好きな順」のときだけ true */
  reorderEnabled?: boolean;
  /** 「並び替え」を押したときに呼ぶ。並べ方を「好きな順」に切り替える */
  onEnableReorder?: () => void;
  /** ドラッグで activeId を overId の位置に動かしたときに呼ぶ */
  onReorderItem?: (activeId: string, overId: string) => void;
}) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const perSpread = isMobile ? 1 : 2;
  const [picked, setPicked] = useState<PickedItem | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  // 並べ方がよそから「好きな順」以外に変わったら、並び替えモードも閉じる
  useEffect(() => {
    if (!reorderEnabled) setReorderMode(false);
  }, [reorderEnabled]);

  const toggleReorderMode = () => {
    if (reorderMode) {
      setReorderMode(false);
      toast.success(t("collectionScreen.binder.reorderSaved"));
      return;
    }
    onEnableReorder?.();
    setReorderMode(true);
  };

  const pages = useMemo(() => {
    const out: BinderItem[][] = [];
    for (let i = 0; i < items.length; i += PER_PAGE) out.push(items.slice(i, i + PER_PAGE));
    if (out.length === 0) out.push([]);
    // 見開きのときは右ページが空でもポケットを見せる（ファイルの続きがある感じ）
    if (perSpread === 2 && out.length % 2 === 1) out.push([]);
    return out;
  }, [items, perSpread]);

  const spreads = Math.ceil(pages.length / perSpread);
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  // 並び替え・絞り込み・画面幅が変わったら、はみ出さないように戻す
  useEffect(() => {
    setSpread((s) => Math.min(s, spreads - 1));
  }, [spreads]);

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(spreads - 1, spread + delta));
    if (next === spread) return;
    setDir(delta > 0 ? "next" : "prev");
    setSpread(next);
  };

  // スワイプでめくる（横に 50px 以上動かしたら）
  const touchX = useRef<number | null>(null);

  const shown = pages.slice(spread * perSpread, spread * perSpread + perSpread);

  return (
    <div className="space-y-3">
      {isOwn && (
        <div className="flex items-center justify-end gap-2">
          {reorderMode && (
            <span className="text-xs text-muted-foreground">{t("collectionScreen.binder.reorderHint")}</span>
          )}
          <Button
            variant={reorderMode ? "default" : "outline"}
            size="sm"
            onClick={toggleReorderMode}
            className="h-8 gap-1.5 rounded-full px-3"
          >
            {reorderMode ? <Check className="h-3.5 w-3.5" /> : <Move className="h-3.5 w-3.5" />}
            {reorderMode ? t("collectionScreen.binder.reorderDone") : t("collectionScreen.binder.reorder")}
          </Button>
        </div>
      )}

      {reorderMode ? (
        <BinderReorderGrid
          items={items}
          isOwn={isOwn}
          onPick={setPicked}
          onReorderItem={onReorderItem}
        />
      ) : (
        <>
          <div
            className="mx-auto max-w-3xl touch-pan-y select-none"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            }}
          >
            {/* 表紙の色の外枠。中に台紙のページ */}
            <div className="rounded-[1.4rem] bg-primary/85 p-2 shadow-lg dark:bg-primary/60">
              <div
                key={spread}
                className={cn(
                  "grid gap-2",
                  perSpread === 2 ? "grid-cols-2" : "grid-cols-1",
                  dir === "next" && "motion-safe:animate-page-flip-right",
                  dir === "prev" && "motion-safe:animate-page-flip-left"
                )}
              >
                {shown.map((page, pi) => (
                  <BinderPage
                    key={pi}
                    items={page}
                    ringSide={perSpread === 2 && pi === 0 ? "right" : "left"}
                    onPick={(item) =>
                      setPicked({
                        kind: "user",
                        id: item.id,
                        title: item.title,
                        image: item.image ?? "",
                        ownerId: item.user_id,
                        isOwn,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => go(-1)}
              disabled={spread === 0}
              aria-label={t("collectionScreen.binder.prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center text-sm font-semibold tabular-nums text-muted-foreground">
              {t("collectionScreen.binder.page", { n: spread + 1, total: spreads })}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => go(1)}
              disabled={spread >= spreads - 1}
              aria-label={t("collectionScreen.binder.next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      <PickedItemModal picked={picked} onClose={() => setPicked(null)} />
    </div>
  );
}

/**
 * 並び替えモード: ページ送りをやめて、持っているグッズを1枚のポケット一覧にする。
 * つかんで（スマホは長押し、PCはそのままドラッグ）好きな位置に動かすと、その場で保存する。
 */
function BinderReorderGrid({
  items,
  isOwn,
  onPick,
  onReorderItem,
}: {
  items: BinderItem[];
  isOwn: boolean;
  onPick: (picked: PickedItem) => void;
  onReorderItem?: (activeId: string, overId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    onReorderItem?.(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-3 gap-2 rounded-xl bg-[#26222b] p-3 shadow-inner sm:grid-cols-5 md:grid-cols-6 dark:bg-[#17141b]">
          {items.map((item) => (
            <SortablePocket key={item.id} item={item} isOwn={isOwn} onPick={onPick} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortablePocket({
  item,
  isOwn,
  onPick,
}: {
  item: BinderItem;
  isOwn: boolean;
  onPick: (picked: PickedItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn(isDragging && "z-10 opacity-70")}>
      <button
        type="button"
        onClick={() =>
          onPick({
            kind: "user",
            id: item.id,
            title: item.title,
            image: item.image ?? "",
            ownerId: item.user_id,
            isOwn,
          })
        }
        aria-label={item.title}
        className="group relative block aspect-[63/88] w-full cursor-grab overflow-hidden rounded-md bg-white/5 ring-1 ring-white/15 transition-transform active:scale-95 active:cursor-grabbing"
      >
        {item.image ? (
          <img
            src={getOptimizedImageUrl(item.image, { width: 240 })}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center p-1.5 text-center text-3xs leading-tight text-white/70">
            {item.title}
          </span>
        )}
        {item.quantity && item.quantity > 1 ? (
          <span className="absolute bottom-1 right-1 rounded-full bg-primary px-1.5 text-3xs font-bold text-primary-foreground">
            ×{item.quantity}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function BinderPage({
  items,
  ringSide,
  onPick,
}: {
  items: BinderItem[];
  ringSide: "left" | "right";
  onPick: (item: BinderItem) => void;
}) {
  const pockets = Array.from({ length: PER_PAGE }, (_, i) => items[i] ?? null);
  return (
    <div
      className={cn(
        "relative rounded-xl bg-[#26222b] p-2.5 shadow-inner dark:bg-[#17141b]",
        ringSide === "left" ? "pl-6" : "pr-6"
      )}
    >
      {/* とじ穴 */}
      <div
        className={cn(
          "absolute inset-y-0 flex flex-col justify-around py-6",
          ringSide === "left" ? "left-1.5" : "right-1.5"
        )}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-3 w-3 rounded-full bg-background/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" />
        ))}
      </div>

      <ul className="grid grid-cols-3 gap-1.5">
        {pockets.map((item, i) => (
          <li key={item?.id ?? `empty-${i}`}>
            {item ? (
              <button
                type="button"
                onClick={() => onPick(item)}
                aria-label={item.title}
                className="group relative block aspect-[63/88] w-full overflow-hidden rounded-md bg-white/5 ring-1 ring-white/15 transition-transform active:scale-95"
              >
                {item.image ? (
                  <img
                    src={getOptimizedImageUrl(item.image, { width: 240 })}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center p-1.5 text-center text-3xs leading-tight text-white/70">
                    {item.title}
                  </span>
                )}
                {/* スリーブのつや（斜めの光と、上の差し込み口） */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0.06)_28%,transparent_42%,transparent_62%,rgba(255,255,255,0.14)_78%,transparent_90%)] transition-opacity group-hover:opacity-70"
                />
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-white/30" />
                {item.quantity && item.quantity > 1 ? (
                  <span className="absolute bottom-1 right-1 rounded-full bg-primary px-1.5 text-3xs font-bold text-primary-foreground">
                    ×{item.quantity}
                  </span>
                ) : null}
              </button>
            ) : (
              // 空きポケット
              <div
                aria-hidden
                className="aspect-[63/88] w-full rounded-md bg-white/[0.04] ring-1 ring-white/10 [background-image:linear-gradient(115deg,rgba(255,255,255,0.10)_0%,transparent_35%)]"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
