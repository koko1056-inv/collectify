import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Camera, Check, ChevronRight, Flame, Gift, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDailyHub } from "@/hooks/useDailyHub";
import { useOshiNewBadge } from "@/hooks/useOshiReleases";
import { useOshiPhotos } from "@/hooks/useOshi";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";

/**
 * 推しの新着と、今日のチェックを1行にまとめた帯。コレクション画面の検索の下に置く。
 *
 * 並びの考え方（アプリの中心は「登録する → 眺める → コンプ → 交換」）:
 *  1) 主役は「推しの新着」。新商品を見て、持っているものを登録する入口なので、帯の幅のほとんどを渡す。
 *     押すと「推しの新商品」の画面（/releases: 今週発売・カレンダー・新着）。まだ見ていない新着は件数で出す（見たら消える）
 *  2) 連続ログイン（炎）と推しフォトは、毎日の習慣の小さなボタンに縮める。
 *     以前は炎が帯の主役で、新着は横の小さな四角だった（「何のアプリか」より「毎日開く理由」が前に出ていた）。
 *     炎を押すと、ボーナスの次の段階と「ポイントのもらい方」への入口が開く。
 *     以前ここにあった「投稿 +3pt・コメント +1pt・交換 +10pt」の札は、もらい方の画面にまとめた（額の正はサーバーの表）
 */
export function DailyHubCard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const hub = useDailyHub();
  const releases = useOshiNewBadge();
  const [expanded, setExpanded] = useState(false);
  const oshi = useOshiPhotos();

  // 連続ログインの記録がまだ読めていないとき・初回のログイン前は何も出さない
  if (!hub.ready) return null;

  const unseen = releases.unseen > 99 ? "99+" : releases.unseen;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-2">
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => navigate(releases.unseen > 0 ? "/releases?tab=new" : "/releases")}
          data-testid="daily-releases"
          aria-label={releases.unseen > 0 ? t("engage.dailyHub.newForYou", { n: releases.unseen }) : t("discover.releases.title")}
          className="relative flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <IconTile tone="primary" size="md">
            {releases.unseen > 0 ? <Sparkles /> : <CalendarDays />}
          </IconTile>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{t("engage.dailyHub.releasesTitle")}</span>
            <span className={cn("block truncate text-2xs", releases.unseen > 0 ? "font-bold text-primary" : "text-muted-foreground")}>
              {releases.unseen > 0 ? t("engage.dailyHub.releasesNew", { n: unseen }) : t("engage.dailyHub.releasesNone")}
            </span>
          </span>
          {releases.unseen > 0 && <span aria-hidden="true" className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />}
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>

        <StripButton
          onClick={() => setExpanded((v) => !v)}
          icon={<Flame className="h-4 w-4" />}
          label={hub.streak > 0 ? t("engage.dailyHub.streakChip", { n: hub.streak }) : t("engage.dailyHub.today")}
          ariaLabel={hub.streak > 0 ? t("engage.dailyHub.streak", { n: hub.streak }) : t("engage.dailyHub.streakNone")}
          expanded={expanded}
          warm={hub.streak > 0}
        />
        <StripButton
          onClick={() => navigate("/oshi")}
          icon={oshi.todayDone ? <Check className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          label={t("engage.oshi.todayShort")}
          ariaLabel={`${t("engage.oshi.todayCard")}: ${oshi.todayDone ? t("engage.oshi.todayDone") : t("engage.oshi.todayNotYet")}`}
          done={oshi.todayDone}
        />
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t px-2 pb-1 pt-2">
          <p className="text-xs">
            <span className="font-bold">
              {hub.streak > 0 ? t("engage.dailyHub.streak", { n: hub.streak }) : t("engage.dailyHub.streakNone")}
            </span>
            <span className="text-muted-foreground">
              {" · "}
              {hub.claimedToday && hub.todayPoints !== null
                ? t("engage.dailyHub.claimed", { n: hub.todayPoints })
                : t("engage.dailyHub.notClaimed")}
            </span>
          </p>
          {hub.next && (
            <p className="text-xs font-medium text-primary">
              {t("engage.dailyHub.next", { days: hub.next.inDays, points: hub.next.points })}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate("/point-shop/earn")}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Gift className="h-3.5 w-3.5" aria-hidden="true" />
            {t("engage.dailyHub.earnLink")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </Card>
  );
}

function StripButton({
  onClick,
  icon,
  label,
  ariaLabel,
  done,
  expanded,
  warm,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  done?: boolean;
  /** 開閉するボタン（炎）のとき、開いているか */
  expanded?: boolean;
  /** 連続ログイン中（炎を暖色にする） */
  warm?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border bg-card px-1 py-1.5 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className={cn("text-muted-foreground", warm && "text-warning", done && "text-success")} aria-hidden="true">
        {icon}
      </span>
      <span className="max-w-full truncate text-3xs font-bold">{label}</span>
    </button>
  );
}
