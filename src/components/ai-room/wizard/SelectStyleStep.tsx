import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ROOM_STYLE_PRESETS } from "../roomStylePresets";

interface Props {
  stylePresetId: string | null;
  onStylePresetChange: (id: string | null) => void;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
}

export function SelectStyleStep({
  stylePresetId,
  onStylePresetChange,
  customPrompt,
  onCustomPromptChange,
  title,
  onTitleChange,
}: Props) {
  return (
    <motion.div
      key="style"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="p-5 space-y-4"
    >
      <div>
        <h3 className="text-base font-semibold mb-1">部屋のスタイル</h3>
        <p className="text-xs text-muted-foreground">
          プリセットを選ぶか、自由に記述できます
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROOM_STYLE_PRESETS.map((p) => {
          const active = stylePresetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onStylePresetChange(active ? null : p.id)}
              className={cn(
                "relative rounded-xl overflow-hidden border-2 transition-all text-left",
                active
                  ? "border-primary scale-[0.98] shadow-md"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div
                className={cn(
                  "aspect-[5/3] w-full flex items-center justify-center bg-gradient-to-br relative",
                  p.gradient
                )}
              >
                <span className="text-4xl drop-shadow-md">{p.emoji}</span>
                {active && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="p-2 bg-card">
                <p className="text-xs font-semibold">{p.name}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {p.tagline}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium">
          追加の要望 <span className="text-xs text-muted-foreground font-normal">(任意)</span>
        </p>
        <Textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="例: 窓から桜が見える、猫がいる、ぬいぐるみをたくさん..."
          maxLength={300}
          rows={3}
          className="resize-none"
        />
        <p className="text-[10px] text-right text-muted-foreground">
          {customPrompt.length}/300
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          タイトル <span className="text-xs text-muted-foreground font-normal">(任意)</span>
        </p>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="例: 私の理想のサイバー部屋"
          maxLength={50}
        />
      </div>
    </motion.div>
  );
}
