import { useNavigate } from "react-router-dom";
import { Camera, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { MISSION_SHOOT_HREF, useDailyMission } from "@/hooks/useDailyMission";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/utils/optimized-image";
import { shortenName } from "@/components/pocke/usePockeTips";

/**
 * 今日のミッション。推しグッズ（無ければコレクションのグッズ）と、日替わりの写真のお題。
 * 「撮る」で推しフォトの撮影へ。撮ったら、その写真と「達成！」に変わる。
 * onShoot を渡すと、行き先へ移らずにその場で撮る（推しの部屋の写真タブ）
 */
export function DailyMissionCard({ onShoot, onNavigate, className }: { onShoot?: (itemId: string) => void; onNavigate?: () => void; className?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: mission } = useDailyMission();
  if (!mission?.item) return null;

  const action = t(`pocke.mission.prompts.${mission.prompt_id}.action`);
  const hint = t(`pocke.mission.prompts.${mission.prompt_id}.hint`);
  const name = shortenName(mission.item.title);
  const image = mission.completed && mission.photo_url ? mission.photo_url : mission.item.image;

  const shoot = () => {
    if (onShoot) return onShoot(mission.item!.id);
    onNavigate?.();
    navigate(MISSION_SHOOT_HREF);
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-3",
        mission.completed ? "border-success/40 bg-success/5" : "border-points/40 bg-gradient-to-br from-points/10 via-background to-background",
        className
      )}
      aria-label={t("pocke.mission.title")}
    >
      <p className={cn("mb-2 flex items-center gap-1 text-xs font-bold", mission.completed ? "text-success" : "text-points")}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("pocke.mission.title")}
      </p>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {image && (
            <img src={getOptimizedImageUrl(image, { width: 160 })} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
          {mission.completed && (
            <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug">{t("pocke.mission.prompt", { name, action })}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mission.completed ? t("pocke.mission.doneSub") : hint}
          </p>
          <p className={cn("mt-1 text-2xs font-bold", mission.completed ? "text-success" : "text-points")}>
            {mission.completed ? t("pocke.mission.done", { n: mission.bonus }) : t("pocke.mission.reward", { n: mission.bonus })}
          </p>
        </div>
        {!mission.completed && (
          <Button size="sm" className="shrink-0 gap-1 rounded-full" onClick={shoot}>
            <Camera className="h-4 w-4" aria-hidden />
            {t("pocke.mission.shoot")}
          </Button>
        )}
      </div>
    </section>
  );
}
