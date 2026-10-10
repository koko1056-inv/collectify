import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";
import { ROOM_STYLE_PRESETS } from "../roomStylePresets";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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
          <h3 className="text-base font-bold mb-1">{t("aiRoom.style.title")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("aiRoom.style.subtitle")}
          </p>
        </div>
        {stylePresetId && (
          <button
            onClick={() => onStylePresetChange(null)}
            className="text-3xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0 pb-0.5"
          >
            {t("aiRoom.style.clear")}
          </button>
        )}
      </div>

      {/* 以前は虹色グラデーション（pink→fuchsia、sky→blue…）の面に大きな絵文字を載せたカードで、
          ぼかした玉や格子模様まで重ねていた。にぎやかすぎて安っぽく見えたので、
          SelectVisualStep と同じ「アイコンの面＋名前」の静かなカードにそろえる */}
      <div className="grid grid-cols-2 gap-2">
        {ROOM_STYLE_PRESETS.map((p) => {
          const active = stylePresetId === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => onStylePresetChange(active ? null : p.id)}
              aria-pressed={active}
              className={cn(
                "relative rounded-xl border text-left p-3 bg-card transition-colors",
                active
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              {/* 2列だと横並びでは名前が折り返すので、印を上・名前を下に積む */}
              <IconTile tone={active ? "primary" : "muted"} size="sm">
                <Icon />
              </IconTile>
              <p
                className={cn(
                  "mt-2 text-sm font-bold leading-tight",
                  active ? "text-primary" : "text-foreground"
                )}
              >
                {t(`aiRoom.stylePresets.${p.id}.name`)}
              </p>
              <p className="text-3xs text-muted-foreground line-clamp-2 mt-0.5">
                {t(`aiRoom.stylePresets.${p.id}.tagline`)}
              </p>
              {active && (
                <Check className="absolute top-2.5 right-2.5 w-4 h-4 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium">
          {t("aiRoom.style.extraRequest")} <span className="text-xs text-muted-foreground font-normal">{t("aiRoom.common.optional")}</span>
        </p>
        <Textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder={t("aiRoom.style.promptPlaceholder")}
          maxLength={300}
          rows={3}
          className="resize-none"
        />
        <p className="text-3xs text-right text-muted-foreground">
          {customPrompt.length}/300
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {t("aiRoom.style.titleLabel")} <span className="text-xs text-muted-foreground font-normal">{t("aiRoom.common.optional")}</span>
        </p>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t("aiRoom.style.titlePlaceholder")}
          maxLength={50}
        />
      </div>
    </motion.div>
  );
}
