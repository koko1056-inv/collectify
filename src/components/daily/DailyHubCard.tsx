import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Flame, Gift, Heart, Loader2, MessageCircle, Repeat2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoodsPickTile } from "@/components/collection/GoodsPickTile";
import { LazyImage } from "@/components/ui/lazy-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDailyHub } from "@/hooks/useDailyHub";
import { useQuickAddGoods } from "@/hooks/useQuickAddGoods";
import { useOshiPhotos } from "@/hooks/useOshi";
import { cn } from "@/lib/utils";

/**
 * 今日のチェック。毎日開く理由を、1枚のカードにまとめる。
 *  1) 連続ログイン（炎）と、次のボーナス段階までの残り日数 — 途切れさせたくなくなる
 *  2) 推しの新着グッズ — 毎日の自動追加で、開くたびに何か新しいものがある
 *  3) 今日できる、ポイントの付く交流（投稿・コメント・交換）
 */
export function DailyHubCard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const hub = useDailyHub();
  const [open, setOpen] = useState(false);
  const oshi = useOshiPhotos();

  // 連続ログインの記録がまだ読めていないとき・初回のログイン前は何も出さない
  if (!hub.ready) return null;

  const thumbs = hub.newItems.slice(0, 4);

  return (
    <>
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-amber-50/40 p-4 dark:to-amber-950/10">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              hub.streak > 0 ? "bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow" : "bg-muted text-muted-foreground"
            )}
            aria-hidden="true"
          >
            <Flame className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {hub.streak > 0 ? t("engage.dailyHub.streak", { n: hub.streak }) : t("engage.dailyHub.streakNone")}
            </p>
            <p className="text-xs text-muted-foreground">
              {hub.claimedToday && hub.todayPoints !== null
                ? t("engage.dailyHub.claimed", { n: hub.todayPoints })
                : t("engage.dailyHub.notClaimed")}
            </p>
            {hub.next && (
              <p className="text-xs font-medium text-primary">
                {t("engage.dailyHub.next", { days: hub.next.inDays, points: hub.next.points })}
              </p>
            )}
          </div>
          {hub.claimedToday && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Check className="h-3 w-3" aria-hidden="true" />
              {t("engage.dailyHub.today")}
            </span>
          )}
        </div>

        {hub.newTotal > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="flex -space-x-2" aria-hidden="true">
              {thumbs.map((it) => (
                <div key={it.id} className="h-10 w-10 overflow-hidden rounded-lg border-2 border-background bg-muted">
                  <LazyImage src={it.image} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {t("engage.dailyHub.newForYou", { n: hub.newTotal })}
              </p>
              <p className="truncate text-xs text-muted-foreground">{t("engage.dailyHub.newForYouSub")}</p>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate("/oshi")}
          className="mt-3 flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Camera className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{t("engage.oshi.todayCard")}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {oshi.todayDone
                ? t("engage.oshi.todayDone")
                : oshi.streak > 0
                  ? `${t("engage.oshi.todayNotYet")} · ${t("engage.oshi.todayStreak", { n: oshi.streak })}`
                  : t("engage.oshi.todayNotYet")}
            </span>
          </span>
          {oshi.todayDone && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
        </button>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("engage.dailyHub.actionsLabel")}>
          <ActionChip icon={<Gift className="h-3.5 w-3.5" />} label={t("engage.dailyHub.post")} pt="+3" onClick={() => navigate("/item-posts")} />
          <ActionChip icon={<MessageCircle className="h-3.5 w-3.5" />} label={t("engage.dailyHub.comment")} pt="+1" onClick={() => navigate("/item-posts")} />
          <ActionChip icon={<Repeat2 className="h-3.5 w-3.5" />} label={t("engage.dailyHub.trade")} pt="+10" onClick={() => navigate("/explore?tab=users")} />
        </div>
      </Card>

      <NewForYouDialog open={open} onOpenChange={setOpen} />
    </>
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
      <span className="font-semibold tabular-nums text-primary">{pt}pt</span>
    </button>
  );
}

/** 推しの新着を一覧で見て、タップで「持ってる」「ほしい」に入れる */
function NewForYouDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLanguage();
  const hub = useDailyHub();
  const { added, wished, busyId, add, wish } = useQuickAddGoods();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-md overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{t("engage.dailyHub.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("engage.dailyHub.dialogDesc")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[68vh] overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-3 gap-2.5">
            {hub.newItems.map((item) => {
              const owned = added.has(item.id);
              const isWished = wished.has(item.id);
              return (
                <div key={item.id} className="relative min-w-0">
                  <GoodsPickTile
                    image={item.image}
                    title={item.title}
                    subtitle={item.content_name}
                    selected={owned}
                    busy={busyId === item.id}
                    disabled={owned}
                    onClick={() => add(item)}
                    ariaLabel={owned ? `${item.title} ${t("misc.onboarding.starter.added")}` : item.title}
                    footer={
                      <span
                        className={cn(
                          "mt-auto rounded-md py-1 text-center text-[10px] font-semibold",
                          owned ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                        )}
                      >
                        {owned ? t("misc.onboarding.starter.added") : `+ ${t("chrome.fab.addShort")}`}
                      </span>
                    }
                  />
                  {!owned && (
                    <button
                      type="button"
                      disabled={isWished || busyId === item.id}
                      onClick={() => wish(item)}
                      aria-pressed={isWished}
                      aria-label={`${item.title} ${t("collectionScreen.addSheet.wantIt")}`}
                      className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur disabled:opacity-100"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Heart className={cn("h-4 w-4", isWished ? "fill-primary text-primary" : "text-muted-foreground")} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {hub.newTotal > hub.newItems.length && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t("engage.dailyHub.more", { n: hub.newTotal - hub.newItems.length })}
            </p>
          )}
          <Button variant="outline" className="mt-3 w-full" onClick={() => onOpenChange(false)}>
            {t("engage.dailyHub.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
