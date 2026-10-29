import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Camera, Check, Flame, Home, Sparkles, Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { openDailyRing, ringDoneCount, useDailyRing } from "@/hooks/useDailyRing";
import { PockeRing } from "@/components/daily/PockeRing";
import { useOshiNewBadge } from "@/hooks/useOshiReleases";
import { useCompanions, useOshiPhotos } from "@/hooks/useOshi";
import { nextCare } from "@/hooks/useOshiRoomSocial";
import { todayJst } from "@/utils/companion";
import { cn } from "@/lib/utils";

interface CollectionShortcutsProps {
  /** 「コンプ」を押したとき（コンプまであと少し の一覧を開く）。渡さなければ出さない */
  onOpenTargets?: () => void;
}

/**
 * コレクション画面の小さな入口の1行（横にスクロール）。
 * 推しの新着・今日のポッケリング（毎日の目標と連続）・推しフォト・コンプ・推しの部屋。
 * 以前はそれぞれが画面の上のほうで大きなカードになっていて（合わせて約600px）、グッズの一覧が
 * 最初の画面に1つも見えなかった。どれも無くさず、押せば今までと同じ場所へ行ける小さな札にした。
 */
export function CollectionShortcuts({ onOpenTargets }: CollectionShortcutsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: ring } = useDailyRing();
  const releases = useOshiNewBadge();
  const oshi = useOshiPhotos();
  const companions = useCompanions();

  const unseen = releases.unseen > 99 ? "99+" : String(releases.unseen);
  const careLeft = companions.data && companions.data.length > 0 ? nextCare(companions.data, todayJst()) : null;
  const ringDone = ringDoneCount(ring);

  return (
    <div className="space-y-2" data-testid="collection-shortcuts">
      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <Shortcut
          onClick={() => navigate(releases.unseen > 0 ? "/releases?tab=new" : "/releases")}
          icon={releases.unseen > 0 ? <Sparkles /> : <CalendarDays />}
          label={t("engage.dailyHub.releasesTitle")}
          badge={releases.unseen > 0 ? unseen : undefined}
          ariaLabel={releases.unseen > 0 ? t("engage.dailyHub.newForYou", { n: releases.unseen }) : t("discover.releases.title")}
          testId="daily-releases"
        />
        {/* 何の札か（ポッケリング）・今いくつ（1/3）・そろうと何pt かを札だけでわかるようにする。完成したら連続日数を添える */}
        {ring && (
          <Shortcut
            onClick={openDailyRing}
            icon={<PockeRing done={[ring.collect, ring.care, ring.social]} size={22} stroke={4} />}
            label={ring.completed ? t("pocke.ring.chipDone") : t("pocke.ring.chip", { done: ringDone })}
            ariaLabel={t(ring.completed ? "pocke.ring.chipLabelDone" : "pocke.ring.chipLabel", {
              done: ringDone,
              bonus: ring.bonus,
              n: ring.streak,
            })}
            trailing={
              ring.completed ? (
                ring.streak > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-2xs font-bold text-warning tabular-nums">
                    <Flame className="h-3 w-3" />
                    {ring.streak}
                  </span>
                )
              ) : (
                <span className="rounded-full bg-points/15 px-1.5 text-3xs font-bold leading-4 text-points tabular-nums">
                  {t("pocke.ring.chipBonus", { n: ring.bonus })}
                </span>
              )
            }
            dot={!ring.completed}
            testId="daily-ring-chip"
          />
        )}
        <Shortcut
          onClick={() => navigate("/oshi?tab=photo")}
          icon={oshi.todayDone ? <Check /> : <Camera />}
          label={t("engage.oshi.todayShort")}
          ariaLabel={`${t("engage.oshi.todayCard")}: ${oshi.todayDone ? t("engage.oshi.todayDone") : t("engage.oshi.todayNotYet")}`}
          iconClassName={oshi.todayDone ? "text-success" : undefined}
        />
        {onOpenTargets && (
          <Shortcut
            onClick={onOpenTargets}
            icon={<Trophy />}
            label={t("collectionScreen.shortcuts.complete")}
            ariaLabel={t("collectGoals.targets.title")}
          />
        )}
        <Shortcut
          onClick={() => navigate(careLeft ? `/oshi?item=${careLeft.target.user_item_id}` : "/oshi")}
          icon={<Home />}
          label={t("collectionScreen.shortcuts.room")}
          ariaLabel={
            careLeft
              ? t(`oshiRoom.social.mini.wants.${careLeft.action}`, { name: careLeft.target.title })
              : t("collectionScreen.shortcuts.room")
          }
          dot={!!careLeft}
        />
      </div>

    </div>
  );
}

function Shortcut({
  onClick,
  icon,
  label,
  ariaLabel,
  badge,
  trailing,
  dot,
  expanded,
  iconClassName,
  testId,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  ariaLabel: string;
  /** 件数（まだ見ていない新着など） */
  badge?: string;
  /** ラベルのあとに添える小さな札（もらえる pt・連続日数など） */
  trailing?: ReactNode;
  /** 今日まだやることがある印 */
  dot?: boolean;
  /** 開閉するもの（今日分）のとき、開いているか */
  expanded?: boolean;
  iconClassName?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      data-testid={testId}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
        expanded && "border-primary/40 bg-accent"
      )}
    >
      <span className={cn("text-muted-foreground [&>svg]:h-4 [&>svg]:w-4", iconClassName)} aria-hidden="true">
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
      {badge && (
        <span className="rounded-full bg-primary px-1.5 text-3xs font-bold leading-4 text-primary-foreground tabular-nums">{badge}</span>
      )}
      {trailing && <span aria-hidden="true">{trailing}</span>}
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </button>
  );
}
