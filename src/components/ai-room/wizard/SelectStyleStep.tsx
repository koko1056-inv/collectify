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
      <div className="flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold mb-1">部屋のスタイル</h3>
          <p className="text-xs text-muted-foreground">
            お気に入りのテイストを選んでください
          </p>
        </div>
        {stylePresetId && (
          <button
            onClick={() => onStylePresetChange(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0 pb-0.5"
          >
            選択をクリア
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ROOM_STYLE_PRESETS.map((p) => {
          const active = stylePresetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onStylePresetChange(active ? null : p.id)}
              className={cn(
                "group relative rounded-2xl overflow-hidden border transition-all text-left bg-card",
                active
                  ? "border-primary shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)] ring-2 ring-primary/30"
                  : "border-border/60 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              {/* Visual area */}
              <div
                className={cn(
                  "aspect-[5/4] w-full bg-gradient-to-br relative overflow-hidden",
                  p.gradient
                )}
              >
                {/* Decorative blurred orbs */}
                <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/30 blur-2xl" />
                <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-black/15 blur-2xl" />

                {/* Subtle grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Floor line for "room" feeling */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />

                {/* Big emoji */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={cn(
                      "text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)] transition-transform duration-300",
                      active ? "scale-110" : "group-hover:scale-105"
                    )}
                  >
                    {p.emoji}
                  </span>
                </div>

                {/* Inner highlight */}
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-none pointer-events-none" />

                {/* Active check */}
                {active && (
                  <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-background">
                    <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Label area */}
              <div className={cn("px-2.5 py-2 transition-colors", active && "bg-primary/5")}>
                <p
                  className={cn(
                    "text-[13px] font-bold leading-tight",
                    active ? "text-primary" : "text-foreground"
                  )}
                >
                  {p.name}
                </p>
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
