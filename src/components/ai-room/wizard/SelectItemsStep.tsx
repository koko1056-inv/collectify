import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

export interface UserItemLite {
  id: string;
  title: string;
  image: string;
}

interface Props {
  items: UserItemLite[];
  selectedItems: UserItemLite[];
  onToggle: (item: UserItemLite) => void;
  maxItems: number;
  /** グッズが1つも無いときに、追加画面へ送るための導線 */
  onClose?: () => void;
}

export function SelectItemsStep({ items, selectedItems, onToggle, maxItems, onClose }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // コレクションは最大100件まで読み込むので、3列グリッドから
  // 目当ての5個を探すのは骨が折れる。名前で絞り込めるようにする。
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.title.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <motion.div
      key="items"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="p-5 space-y-4"
    >
      <div>
        <h3 className="text-base font-semibold mb-1">{t("aiRoom.items.title")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("aiRoom.items.descPrefix")}{maxItems}{t("aiRoom.items.descSuffix")}
        </p>
      </div>

      {items.length === 0 ? (
        // 「グッズを追加してください」と言うだけでは、ここから追加しに行けない
        <EmptyState
          title={t("aiRoom.items.empty1")}
          description={t("aiRoom.items.empty2")}
          className="py-10"
          action={
            <Button
              onClick={() => {
                onClose?.();
                navigate("/collection");
              }}
            >
              {t("aiRoom.items.goAddGoods")}
            </Button>
          }
        />
      ) : (
        <>
          {items.length > 8 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("aiRoom.items.searchPlaceholder")}
                className="h-9 pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("aiRoom.items.clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* 絞り込むと選んだグッズが画面から消えることがあるので、
              選択中のものは常にここで確認・解除できるようにする */}
          {selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item)}
                  className="flex max-w-full items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-1 pl-1 pr-2 text-xs"
                >
                  <img src={getOptimizedImageUrl(item.image, { width: 150 })} onError={fallbackToOriginal(item.image)} loading="lazy" decoding="async" alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                  <span className="truncate">{item.title}</span>
                  <X className="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t("aiRoom.items.noHitTitle")}
              description={t("aiRoom.items.noHitDesc")}
              className="py-8"
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((item) => {
                const isSelected = selectedItems.some((s) => s.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => onToggle(item)}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                      isSelected
                        ? "border-primary scale-[0.95] shadow-md"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <img src={getOptimizedImageUrl(item.image, { width: 150 })} onError={fallbackToOriginal(item.image)} loading="lazy" decoding="async" alt="" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
