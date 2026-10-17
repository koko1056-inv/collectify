import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CollectionGrid } from "./CollectionGrid";
import { DragEndEvent } from "@dnd-kit/core";
import { CollectionWishlist } from "./CollectionWishlist";
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
  /** 持ってる（とマイタグ）のときだけ、タブと一覧のあいだに出すもの（作品の札・並び替えなど） */
  beforeGrid?: ReactNode;
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
  beforeGrid,
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
      {/* タブ列：持ってる / ほしい / 予約中 / 手放した / マイタグ...（下線のタブ。以前は塗りの丸ボタンで、画面の中でいちばん目立っていた） */}
      <div
        role="tablist"
        className="-mx-3 mb-3 flex gap-5 overflow-x-auto border-b px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-1"
      >
        {tabs.map((tab) => {
          const isActive = activeView === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelectTab(tab.value)}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b-2 py-2.5 text-sm transition-colors",
                isActive
                  ? "border-primary font-bold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!showPreorders && !showPast && !showWishlist && beforeGrid && <div className="mb-3 space-y-2">{beforeGrid}</div>}

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
