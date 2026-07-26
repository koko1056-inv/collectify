import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PersonalTagTabsProps {
  tags: string[];
  selectedTag: string;
  onSelect: (tag: string) => void;
  className?: string;
}

/**
 * マイタグでコレクションを絞り込むタブ。
 * 横スクロール可能。「すべて」を含む。
 */
export function PersonalTagTabs({
  tags,
  selectedTag,
  onSelect,
  className,
}: PersonalTagTabsProps) {
  const { t } = useLanguage();
  const allTabs = ["すべて", ...tags];

  if (tags.length === 0) {
    return (
      <div className={cn("px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5", className)}>
        <Tag className="w-3.5 h-3.5" />
        {t("collectionScreen.personalTags.emptyHint")}
      </div>
    );
  }

  return (
    <div className={cn("relative border-b border-border/60", className)}>
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 px-2 pb-0.5">
          {allTabs.map((tab) => {
            const value = tab === "すべて" ? "" : tab;
            const isActive = selectedTag === value;
            return (
              <button
                key={tab}
                onClick={() => onSelect(value)}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "すべて" ? t("collectionScreen.personalTags.all") : tab}
                {isActive && (
                  <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-foreground" />
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
