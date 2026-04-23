import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
}

export function SelectItemsStep({ items, selectedItems, onToggle, maxItems }: Props) {
  return (
    <motion.div
      key="items"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="p-5 space-y-4"
    >
      <div>
        <h3 className="text-base font-semibold mb-1">推しグッズを選ぶ</h3>
        <p className="text-xs text-muted-foreground">
          1〜{maxItems}個のグッズを選ぶと、AIがあなたの部屋に配置します
        </p>
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          コレクションにアイテムがありません。
          <br />
          まずはグッズを追加してください。
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => {
            const isSelected = selectedItems.some((s) => s.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => onToggle(item)}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                  isSelected
                    ? "border-primary scale-[0.95] shadow-md"
                    : "border-border hover:border-primary/40"
                )}
              >
                <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
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
    </motion.div>
  );
}
