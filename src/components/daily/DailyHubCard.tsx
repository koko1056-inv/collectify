import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Camera, Check, ChevronDown, Flame, Gift, MessageCircle, Repeat2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDailyHub } from "@/hooks/useDailyHub";
import { useOshiNewBadge } from "@/hooks/useOshiReleases";
import { useOshiPhotos } from "@/hooks/useOshi";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";

/**
 * 今日のチェック。毎日開く理由を、1枚のカードにまとめる。
 *  1) 連続ログイン（炎）と、次のボーナス段階までの残り日数 — 途切れさせたくなくなる
 *  2) 推しの新商品 — 毎日の自動追加で、開くたびに何か新しいものがある。
 *     押すと「推しの新商品」の画面（/releases: 今週発売・カレンダー・新着）を開く。
 *     前に見たとき以降に入った推しの新着の件数をバッジで出す（見たら消える）
 *  3) 今日できる、ポイントの付く交流（投稿・コメント・交換）
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

  return (
    <>
      {/* 普段は1行の帯にまとめる（以前は約320pxあり、コレクションの最初の画面がこれで埋まっていた）。
          炎をタップすると、ボーナスの詳細とポイントの付く交流が開く */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-points-soft/40 p-2">
        <div className="flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {/* 炎の面。以前は orange→rose のグラデーションに白い炎で、ここだけ浮いていた。
                連続中は warning のトークンの薄い面、途切れているときは muted */}
            <IconTile tone={hub.streak > 0 ? "warning" : "muted"} size="md">
              <Flame />
            </IconTile>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">
                {hub.streak > 0 ? t("engage.dailyHub.streakShort", { n: hub.streak }) : t("engage.dailyHub.streakNone")}
              </span>
              <span className="block truncate text-2xs text-muted-foreground">
                {hub.claimedToday && hub.todayPoints !== null
                  ? t("engage.dailyHub.claimed", { n: hub.todayPoints })
                  : t("engage.dailyHub.notClaimed")}
              </span>
            </span>
            <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          </button>

          {/* 以前は推しの新着があるときだけ出し、小さなダイアログを開いていた。
              いまは発売カレンダーへの入口として常に出し、まだ見ていない新着があれば件数を出す */}
          <StripButton
            onClick={() => navigate(releases.unseen > 0 ? "/releases?tab=new" : "/releases")}
            icon={releases.unseen > 0 ? <Sparkles className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
            label={releases.unseen > 0 ? t("engage.dailyHub.newShort", { n: releases.unseen > 99 ? "99+" : releases.unseen }) : t("discover.releases.stripLabel")}
            ariaLabel={releases.unseen > 0 ? t("engage.dailyHub.newForYou", { n: releases.unseen }) : t("discover.releases.title")}
            badge={releases.unseen > 0}
            testId="daily-releases"
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
          <div className="mt-2 space-y-2 border-t px-2 pb-1 pt-2">
            {hub.next && (
              <p className="text-xs font-medium text-primary">
                {t("engage.dailyHub.next", { days: hub.next.inDays, points: hub.next.points })}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("engage.dailyHub.actionsLabel")}>
              <ActionChip icon={<Gift className="h-3.5 w-3.5" />} label={t("engage.dailyHub.post")} pt="+3" onClick={() => navigate("/item-posts")} />
              <ActionChip icon={<MessageCircle className="h-3.5 w-3.5" />} label={t("engage.dailyHub.comment")} pt="+1" onClick={() => navigate("/item-posts")} />
              <ActionChip icon={<Repeat2 className="h-3.5 w-3.5" />} label={t("engage.dailyHub.trade")} pt="+10" onClick={() => navigate("/explore?tab=users")} />
            </div>
          </div>
        )}
      </Card>

    </>
  );
}

function StripButton({
  onClick,
  icon,
  label,
  ariaLabel,
  done,
  badge,
  testId,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  done?: boolean;
  /** まだ見ていないものがある印（右上の点） */
  badge?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border bg-card px-1 py-1.5 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {badge && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />}
      <span className={cn("text-primary", done && "text-success")} aria-hidden="true">
        {icon}
      </span>
      <span className="max-w-full truncate text-3xs font-bold">{label}</span>
    </button>
  );
}

function ActionChip({ icon, label, pt, onClick }: { icon: React.ReactNode; label: string; pt: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {icon}
      <span>{label}</span>
      <span className="font-bold tabular-nums text-primary">{pt}pt</span>
    </button>
  );
}
