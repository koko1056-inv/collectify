import { Check, Gift, MessageCircle, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PointIcon } from "@/components/ui/point-icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { LEVEL_REWARDS } from "@/lib/oshiLevel";
import { roomI18nId, roomUnlockKey } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { cn } from "@/lib/utils";
import { AssetThumb } from "./AssetThumb";

/**
 * なかよしレベルの特典の一覧（Lv2〜10）。お世話のパネルの「次のレベルで」から開く。
 * 「育てると何がいいのか」を先に見せて、次の目標にしてもらうための表。
 *  - ポイント: そのグッズで受け取り済みか（いまのレベル以下なら済み）
 *  - 部屋のアイテム: アカウントで解放済みか（どれか1つの推しグッズが届いていれば済み）
 *  - 反応: その段階に入るレベルに印
 */
export function LevelRewardsSheet({
  open,
  onOpenChange,
  level,
  name,
  owned,
  oshi,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** いま見ている推しグッズのレベル */
  level: number;
  name: string;
  owned: ReadonlySet<string>;
  oshi: OshiColor;
}) {
  const { t } = useLanguage();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[88vh] max-w-lg overflow-y-auto rounded-t-3xl px-4 pt-5">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-points" />
            {t("oshiRoom.rewards.title")}
          </SheetTitle>
          <SheetDescription>{t("oshiRoom.rewards.desc")}</SheetDescription>
        </SheetHeader>
        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
          {t("oshiRoom.rewards.now", { name, level })}
        </p>
        <ol className="mt-3 space-y-2 pb-4">
          {LEVEL_REWARDS.map((r) => {
            const reached = level >= r.level;
            const setOwned = !!r.set && owned.has(roomUnlockKey(r.set));
            return (
              <li
                key={r.level}
                className={cn("flex items-start gap-2.5 rounded-2xl border p-2.5", reached ? "border-transparent bg-muted/50" : "bg-card", r.level === level + 1 && "border-primary ring-1 ring-primary/30")}
              >
                <span className={cn("flex w-12 shrink-0 flex-col items-center rounded-xl py-1", reached ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  <span className="text-xs font-black tabular-nums">Lv.{r.level}</span>
                  {reached && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-primary">{t(`engage.oshi.levelTitle.${r.level}`)}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold tabular-nums">
                    <PointIcon size={12} />+{r.points}pt
                    {reached && <span className="text-3xs font-normal text-muted-foreground">{t("oshiRoom.rewards.received")}</span>}
                  </p>
                  {r.items.length > 0 && (
                    <div className="mt-1.5">
                      <p className="flex items-center gap-1 text-2xs font-bold">
                        <Gift className="h-3 w-3 text-points" />
                        {t("oshiRoom.rewards.unlock")}
                        {setOwned && <span className="font-normal text-muted-foreground">（{t("oshiRoom.rewards.unlocked")}）</span>}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.items.map((k) => (
                          <span key={k} className="flex w-[4.75rem] flex-col items-center gap-0.5">
                            <AssetThumb k={k} oshi={oshi} className={cn("h-12 w-12 overflow-hidden rounded-xl bg-muted/60", !setOwned && "opacity-80")} />
                            <span className="line-clamp-2 w-full text-center text-3xs leading-tight">{t(`oshiRoom.assets.${roomI18nId(k)}`)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.tier && (
                    <p className="mt-1 flex items-center gap-1 text-2xs text-muted-foreground">
                      {r.tier >= 3 ? <Sparkles className="h-3 w-3 shrink-0 text-primary" /> : <MessageCircle className="h-3 w-3 shrink-0 text-primary" />}
                      {t(`oshiRoom.fx.tierUp.${r.tier}`)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="pb-4 text-3xs leading-relaxed text-muted-foreground">{t("oshiRoom.rewards.note")}</p>
      </SheetContent>
    </Sheet>
  );
}
