import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, Heart, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/components/ui/lazy-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCareCompanion, type Companion } from "@/hooks/useOshi";
import { DAILY_MAX_XP, frameClass, levelProgress, todayJst } from "@/utils/companion";
import { cn } from "@/lib/utils";

interface CompanionCardProps {
  companion: Companion;
  /** 「撮る」を押したとき（この相棒を選んだ状態で写真の画面を開く） */
  onPhoto: (companion: Companion) => void;
  onRemove: (companion: Companion) => void;
}

/**
 * 相棒グッズ。撫でる・磨く・撮る を1日に1回ずつすると、なかよし度（xp）が増えてレベルが上がる。
 * レベルに応じて枠が華やかになる。放置しても減らない。
 */
export function CompanionCard({ companion, onPhoto, onRemove }: CompanionCardProps) {
  const { t } = useLanguage();
  const care = useCareCompanion();
  const [hearts, setHearts] = useState<number[]>([]);
  const today = todayJst();
  const progress = levelProgress(companion.xp);
  const patDone = companion.last_pat_on === today;
  const polishDone = companion.last_polish_on === today;
  const photoDone = companion.last_photo_on === today;
  const doneCount = [patDone, polishDone, photoDone].filter(Boolean).length;

  const handleCare = async (action: "pat" | "polish") => {
    try {
      const result = await care.mutateAsync({ itemId: companion.user_item_id, action });
      if (result.already) return;
      // ハートがふわっと上がる（撫でる）／きらっと光る（磨く）
      const id = Date.now();
      setHearts((prev) => [...prev, id]);
      setTimeout(() => setHearts((prev) => prev.filter((x) => x !== id)), 1100);
      if (result.leveled_up && result.level) {
        toast.success(t("engage.oshi.levelUp", { name: companion.title, level: result.level }), {
          description: t(`engage.oshi.levelTitle.${result.level}`),
          duration: 6000,
        });
      }
    } catch (e) {
      console.error("care failed:", e);
      toast.error(t("engage.oshi.careFailed"));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card p-4">
      <div className="flex gap-4">
        <div className="relative shrink-0">
          <div className={cn("rounded-2xl p-[3px] transition-shadow", frameClass(progress.level))}>
            <div className="relative h-28 w-28 overflow-hidden rounded-[13px] bg-muted">
              <LazyImage src={companion.image} alt={companion.title} className="h-full w-full object-cover" />
              <AnimatePresence>
                {hearts.map((id) => (
                  <motion.span
                    key={id}
                    initial={{ opacity: 0, y: 10, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 0], y: -50, scale: 1.2 }}
                    transition={{ duration: 1.1 }}
                    className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-2xl"
                    aria-hidden="true"
                  >
                    ❤️
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-2xs font-bold text-primary-foreground shadow">
            Lv.{progress.level}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <p className="line-clamp-2 flex-1 text-sm font-bold">{companion.title}</p>
            <button
              type="button"
              onClick={() => onRemove(companion)}
              aria-label={t("engage.oshi.removeCompanion")}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs font-medium text-primary">{t(`engage.oshi.levelTitle.${progress.level}`)}</p>

          <div className="mt-2" aria-label={t("engage.oshi.xpLabel")}>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 to-primary"
                initial={false}
                animate={{ width: `${Math.round(progress.ratio * 100)}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 18 }}
              />
            </div>
            <p className="mt-1 text-2xs tabular-nums text-muted-foreground">
              {progress.isMax
                ? t("engage.oshi.maxLevel")
                : t("engage.oshi.nextLevel", { n: progress.needed - progress.into })}
            </p>
          </div>

          <p className="mt-1 text-2xs text-muted-foreground">
            {doneCount === 3 ? t("engage.oshi.todayAllDone") : t("engage.oshi.todayProgress", { n: doneCount, max: DAILY_MAX_XP })}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <CareButton
          icon={<Heart className="h-4 w-4" />}
          label={t("engage.oshi.pat")}
          xp="+1"
          done={patDone}
          busy={care.isPending}
          onClick={() => handleCare("pat")}
        />
        <CareButton
          icon={<Sparkles className="h-4 w-4" />}
          label={t("engage.oshi.polish")}
          xp="+1"
          done={polishDone}
          busy={care.isPending}
          onClick={() => handleCare("polish")}
        />
        <CareButton
          icon={<Camera className="h-4 w-4" />}
          label={t("engage.oshi.shoot")}
          xp="+3"
          done={photoDone}
          busy={false}
          onClick={() => onPhoto(companion)}
        />
      </div>
    </div>
  );
}

function CareButton({
  icon,
  label,
  xp,
  done,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  xp: string;
  done: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={done ? "secondary" : "outline"}
      disabled={done || busy}
      onClick={onClick}
      className="h-auto flex-col gap-0.5 py-2"
    >
      {done ? <Check className="h-4 w-4 text-primary" /> : icon}
      <span className="text-xs">{label}</span>
      <span className="text-3xs tabular-nums text-muted-foreground">{done ? "✓" : `${xp}xp`}</span>
    </Button>
  );
}
