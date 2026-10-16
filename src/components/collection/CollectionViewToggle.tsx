import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CollectionGrid } from "./CollectionGrid";
import { DragEndEvent } from "@dnd-kit/core";
import { CollectionWishlist } from "./CollectionWishlist";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { usePersonalTags } from "@/hooks/usePersonalTags";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePreorders } from "@/hooks/usePreorders";
import { PreorderList } from "@/components/preorders/PreorderList";
import { PastItemsList } from "./PastItemsList";

type ViewType = "grid" | "wishlist" | "preorders" | "past";

interface CollectionViewToggleProps {
  userId: string;
  items: any[];
  isCompact: boolean;
  handleDragEnd: (event: DragEndEvent) => void;
  selectedPersonalTag?: string;
  onPersonalTagChange?: (tag: string) => void;
  // 選択モード
  isSelectionMode?: boolean;
  selectedItems?: string[];
  onSelectItem?: (itemId: string) => void;
  /** 渡すと、通常表示のグリッドを見出しつきの区切りに分けて並べる（お迎えの月ごとなど） */
  groups?: { key: string; label: string; count: string; items: unknown[] }[];
}

export function CollectionViewToggle({
  userId,
  items,
  isCompact,
  handleDragEnd,
  selectedPersonalTag = "",
  onPersonalTagChange,
  isSelectionMode = false,
  selectedItems = [],
  onSelectItem,
  groups,
}: CollectionViewToggleProps) {
  const { allUserTags } = usePersonalTags();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isOwn = !!user && user.id === userId;
  // 予約中は本人だけ（いくら使ったかは人に見せない）
  const { preorders } = usePreorders();
  const [params, setParams] = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  // 「通常表示 / 欲しい物リスト / 予約中」の切替（マイタグ選択時は無効）。
  // ?view=preorders（発売日の通知・コレクション上のお知らせ）から開いたときは予約中を出す
  const [viewType, setViewType] = useState<ViewType>(() => {
    const v = params.get("view");
    return isOwn && (v === "preorders" || v === "past") ? v : "grid";
  });
  const viewParam = params.get("view");
  useEffect(() => {
    if ((viewParam !== "preorders" && viewParam !== "past") || !isOwn) return;
    setViewType(viewParam);
    onPersonalTagChange?.("");
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 開いた合図（view）が変わったときだけ
  }, [viewParam, isOwn]);

  // 現在アクティブなタブ：マイタグ選択中ならそのタグ、なければ viewType
  const activeView: string = selectedPersonalTag || viewType;

  const handleSelectTab = (value: string) => {
    // タブを自分で選んだら、URL の「予約中を開く」合図は消す（戻る・再読み込みで勝手に戻らないように）
    if (viewParam) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("view");
          return next;
        },
        { replace: true }
      );
    }
    if (value === "grid" || value === "wishlist" || value === "preorders" || value === "past") {
      setViewType(value);
      onPersonalTagChange?.("");
    } else {
      // マイタグ選択時は通常表示に戻す
      setViewType("grid");
      onPersonalTagChange?.(value);
    }
  };

  const tabs: { value: string; label: string }[] = [
    { value: "grid", label: t("collectionScreen.viewToggle.grid") },
    { value: "wishlist", label: t("collectionScreen.viewToggle.wishlist") },
    ...(isOwn
      ? [
          { value: "preorders", label: preorders.length > 0 ? `${t("preorders.button.preordered")} ${preorders.length}` : t("preorders.button.preordered") },
          // 手放したグッズ（交換で渡した・売った・あげた）。図鑑の歴史として残す
          { value: "past", label: t("records.past.tab") },
        ]
      : []),
    ...allUserTags.map((tag) => ({ value: tag, label: tag })),
  ];

  const showWishlist = activeView === "wishlist";
  const showPreorders = isOwn && activeView === "preorders";
  const showPast = isOwn && activeView === "past";

  const emptyTitle = selectedPersonalTag
    ? `${t("collectionScreen.viewToggle.taggedEmptyPrefix")}${selectedPersonalTag}${t("collectionScreen.viewToggle.taggedEmptySuffix")}`
    : t("collectionScreen.viewToggle.empty");

  return (
    <div className="w-full scroll-mt-20" ref={rootRef}>
      {/* タブ列：通常表示 / 欲しい物リスト / マイタグ... */}
      <div className="relative mb-4">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 px-1 pb-0.5">
            {tabs.map((tab) => {
              const isActive = activeView === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleSelectTab(tab.value)}
                  className={cn(
                    "relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap rounded-full",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1" />
        </ScrollArea>
      </div>

      {showPreorders ? (
        <PreorderList />
      ) : showPast ? (
        <PastItemsList />
      ) : showWishlist ? (
        <CollectionWishlist userId={userId} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title={emptyTitle} />
      ) : groups ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="mb-2 flex items-baseline gap-2 px-1 text-sm font-bold text-foreground">
                {group.label}
                <span className="text-xs font-normal text-muted-foreground tabular-nums">{group.count}</span>
              </h3>
              <CollectionGrid
                items={group.items}
                isCompact={isCompact}
                isSelectionMode={isSelectionMode}
                selectedItems={selectedItems}
                onSelectItem={onSelectItem ?? (() => {})}
                // 月ごとの並びは日付で決まるので、ドラッグでの入れ替えはしない
                onDragEnd={() => {}}
              />
            </section>
          ))}
        </div>
      ) : (
        <CollectionGrid
          items={items}
          isCompact={isCompact}
          isSelectionMode={isSelectionMode}
          selectedItems={selectedItems}
          onSelectItem={onSelectItem ?? (() => {})}
          onDragEnd={handleDragEnd}
        />
      )}
    </div>
  );
}
