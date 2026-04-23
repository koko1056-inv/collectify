import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ROOM_VISUAL_STYLES } from "../roomVisualStyles";

interface Props {
  visualStyleId: string;
  onVisualStyleChange: (id: string) => void;
  isFirstTime: boolean;
  cost: number;
}

export function SelectVisualStep({
  visualStyleId,
  onVisualStyleChange,
  isFirstTime,
  cost,
}: Props) {
  return (
    <motion.div
      key="visual"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="p-5 space-y-4"
    >
      <div>
        <h3 className="text-base font-semibold mb-1">絵柄スタイル</h3>
        <p className="text-xs text-muted-foreground">
          部屋をどんなタッチで描くか選びましょう
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
          <Sparkles className="w-3 h-3" />
          {isFirstTime
            ? "初回無料で生成できます 🎁"
            : `1回の生成に ${cost}pt 消費します`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROOM_VISUAL_STYLES.map((v) => {
          const active = visualStyleId === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onVisualStyleChange(v.id)}
              className={cn(
                "relative rounded-xl overflow-hidden border-2 transition-all text-left p-3 bg-card",
                active
                  ? "border-primary scale-[0.98] shadow-md ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl shrink-0">{v.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold flex items-center gap-1">
                    {v.name}
                    {active && (
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {v.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
