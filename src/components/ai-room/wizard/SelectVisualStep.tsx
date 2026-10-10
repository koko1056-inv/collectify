import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";
import { ROOM_VISUAL_STYLES } from "../roomVisualStyles";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  return (
    <motion.div
      key="visual"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="p-5 space-y-4"
    >
      <div>
        <h3 className="text-base font-bold mb-1">{t("aiRoom.visual.title")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("aiRoom.visual.subtitle")}
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-2xs font-bold">
          <Sparkles className="w-3 h-3" />
          {isFirstTime
            ? t("aiRoom.visual.firstFree")
            : `${t("aiRoom.visual.costPrefix")}${cost}${t("aiRoom.visual.costSuffix")}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROOM_VISUAL_STYLES.map((v) => {
          const active = visualStyleId === v.id;
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => onVisualStyleChange(v.id)}
              aria-pressed={active}
              className={cn(
                "relative rounded-xl border text-left p-3 bg-card transition-colors",
                active
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              {/* 以前は絵文字（✨📸🎨…）を大きく置いていた。スタイル選びと同じアイコンの面にそろえる */}
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
                {t(`aiRoom.visualStyles.${v.id}.name`)}
              </p>
              <p className="text-3xs text-muted-foreground line-clamp-2 mt-0.5">
                {t(`aiRoom.visualStyles.${v.id}.description`)}
              </p>
              {active && (
                <Check className="absolute top-2.5 right-2.5 w-4 h-4 text-primary" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
