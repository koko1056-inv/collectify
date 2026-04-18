import { OfficialItem } from "@/types";
import { MemoizedOfficialGoodsCard } from "./MemoizedOfficialGoodsCard";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfficialItemsGridProps {
  items: OfficialItem[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function OfficialItemsGrid({
  items,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: OfficialItemsGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-4 px-1 sm:px-2">
      {items.map((item) => {
        const isSelected = selectedIds?.has(item.id) ?? false;
        return (
          <div key={item.id} className="relative">
            {selectionMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleSelect?.(item.id);
                }}
                className="absolute inset-0 z-20 cursor-pointer"
                aria-label={isSelected ? "選択解除" : "選択"}
              >
                <span
                  className={cn(
                    "absolute top-1.5 left-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background/80 border-border"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>
                {isSelected && (
                  <span className="absolute inset-0 ring-2 ring-primary rounded-md bg-primary/10" />
                )}
              </button>
            )}
            <MemoizedOfficialGoodsCard
              id={item.id}
              title={item.title}
              image={item.image}
              artist={item.artist}
              anime={item.anime}
              price={item.price}
              releaseDate={item.release_date}
              createdBy={item.created_by}
              contentName={item.content_name}
            />
          </div>
        );
      })}
    </div>
  );
}
