import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Cookie, Gift, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTile, type IconTileTone } from "@/components/ui/icon-tile";
import { PointIcon } from "@/components/ui/point-icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPoints } from "@/hooks/usePoints";
import { useCompanionGiftKinds, useTodayGiftCounts, type Companion, type GiftKind } from "@/hooks/useOshi";
import { LEVEL_XP, levelFromXp, levelProgress } from "@/utils/companion";
import { cn } from "@/lib/utils";

interface CompanionGiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companion: Companion;
  /** 贈る（通信と、贈ったあとの演出は CompanionCard 側でする）。成功したら true */
  onGive: (gift: GiftKind) => Promise<boolean>;
  busy: boolean;
}

/** 種類ごとの見た目。値段・xp・回数は DB から読む（ここに数字は置かない） */
const GIFT_LOOK: Record<string, { icon: typeof Cookie; tone: IconTileTone }> = {
  snack: { icon: Cookie, tone: "warning" },
  special: { icon: Gift, tone: "primary" },
};

/**
 * 推しグッズにプレゼントを贈るシート。
 * おやつ（安い・1日に数回）と特別なプレゼント（高い・1日1回）から選ぶ。
 * 残高・今日あと何回・贈るとどこまで上がるかを、押す前に見せる（ポイントを使うので、結果が分かってから押せるように）。
 */
export function CompanionGiftSheet({ open, onOpenChange, companion, onGive, busy }: CompanionGiftSheetProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const kinds = useCompanionGiftKinds();
  const counts = useTodayGiftCounts();
  const points = useUserPoints();
  const balance = points.data?.total_points ?? 0;
  const progress = levelProgress(companion.xp);
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => kinds.data ?? [], [kinds.data]);
  const remainingOf = (g: GiftKind) => Math.max(0, g.daily_limit - (counts.data?.[`${companion.user_item_id}:${g.kind}`] ?? 0));
  const availableOf = (g: GiftKind) => remainingOf(g) > 0 && balance >= g.price && !progress.isMax;

  // 開いたときは、今贈れるものを先に選んでおく（無ければ最初のもの）
  useEffect(() => {
    if (!open || list.length === 0) return;
    setSelected((prev) => {
      if (prev && list.some((g) => g.kind === prev)) return prev;
      return (list.find((g) => availableOf(g)) ?? list[0]).kind;
    });
    // availableOf は残高・回数から決まる。開いた時点の値で一度だけ選べばよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, list]);

  const gift = list.find((g) => g.kind === selected) ?? null;
  const giftName = (g: GiftKind) => t(`engage.oshi.giftKind.${g.kind}.name`);
  const remaining = gift ? remainingOf(gift) : 0;
  const short = gift ? Math.max(0, gift.price - balance) : 0;
  const canGive = !!gift && remaining > 0 && short === 0 && !progress.isMax && !busy;

  // 贈ったあとの見通し（レベルが上がるなら新しい称号、上がらないなら次まであと何 xp）
  const preview = (() => {
    if (!gift || progress.isMax) return null;
    const after = companion.xp + gift.xp;
    const level = levelFromXp(after);
    if (level > progress.level) {
      return t("engage.oshi.giftWillLevel", { level, title: t(`engage.oshi.levelTitle.${level}`) });
    }
    const next = LEVEL_XP[level] ?? 0;
    return t("engage.oshi.giftAfterNext", { level: level + 1, n: next - after });
  })();

  const loading = kinds.isLoading || points.isLoading || counts.isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-3xl px-4 pt-5">
        <SheetHeader className="text-left">
          <SheetTitle>{t("engage.oshi.giftTitle")}</SheetTitle>
          <SheetDescription>{t("engage.oshi.giftDesc", { name: companion.title })}</SheetDescription>
        </SheetHeader>

        {/* 今のなかよし度と残高 */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">
              <span className="tabular-nums">Lv.{progress.level}</span>
              <span className="ml-1.5 font-medium text-primary">{t(`engage.oshi.levelTitle.${progress.level}`)}</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xs text-muted-foreground">{t("engage.oshi.giftBalance")}</p>
            {points.isLoading ? (
              <Skeleton className="mt-0.5 h-5 w-16" />
            ) : (
              <p className="inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                <PointIcon size={14} />
                {balance.toLocaleString()}
                <span className="text-2xs font-normal text-muted-foreground">pt</span>
              </p>
            )}
          </div>
        </div>

        {/* プレゼントの種類 */}
        <div className="mt-3 space-y-2" role="radiogroup" aria-label={t("engage.oshi.giftTitle")}>
          {loading
            ? [0, 1].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />)
            : list.map((g) => {
                const look = GIFT_LOOK[g.kind] ?? { icon: Gift, tone: "primary" as const };
                const Icon = look.icon;
                const left = remainingOf(g);
                const isSelected = g.kind === selected;
                const insufficient = balance < g.price;
                return (
                  <motion.button
                    key={g.kind}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    onClick={() => setSelected(g.kind)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary" : "bg-card hover:bg-accent",
                      (left === 0 || insufficient) && !isSelected && "opacity-60"
                    )}
                  >
                    <IconTile tone={look.tone} size="md">
                      <Icon />
                    </IconTile>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold">{giftName(g)}</span>
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-3xs font-bold tabular-nums text-primary">
                          +{g.xp}xp
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-2xs text-muted-foreground">{t(`engage.oshi.giftKind.${g.kind}.line`)}</span>
                      {/* 贈れない理由はカードにも出す（薄くするだけだと、なぜ選べないのか分からない） */}
                      <span
                        className={cn(
                          "mt-0.5 block text-2xs tabular-nums",
                          left === 0 ? "text-muted-foreground" : insufficient ? "font-medium text-destructive" : "text-foreground"
                        )}
                      >
                        {left === 0
                          ? t("engage.oshi.giftUsedUp")
                          : insufficient
                            ? t("engage.oshi.giftShort", { n: g.price - balance })
                            : t("engage.oshi.giftRemaining", { n: left })}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                        <PointIcon size={16} />
                        {g.price}
                        <span className="text-2xs font-normal text-muted-foreground">pt</span>
                      </span>
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        )}
                        aria-hidden="true"
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
        </div>

        {/* 贈ったあとの見通し・足りないとき */}
        <div className="mt-3 min-h-[1.25rem] text-center text-xs" aria-live="polite">
          {progress.isMax ? (
            <p className="text-muted-foreground">{t("engage.oshi.giftMaxLevel")}</p>
          ) : gift && remaining === 0 ? (
            <p className="text-muted-foreground">{t("engage.oshi.giftLimit")}</p>
          ) : (
            // 足りないことはカードに出ているので、ここでは贈ったらどうなるかだけを（足りないときは控えめに）見せる
            preview && <p className={cn("font-bold", short > 0 ? "text-muted-foreground" : "text-primary")}>{preview}</p>
          )}
        </div>

        <div className="mt-3">
          {gift && short > 0 && remaining > 0 && !progress.isMax ? (
            <Button asChild className="h-12 w-full rounded-2xl text-sm font-bold">
              <Link to="/point-shop" onClick={() => onOpenChange(false)}>
                <PointIcon size={16} />
                {t("engage.oshi.giftGetPoints")}
              </Link>
            </Button>
          ) : (
            <Button
              className="h-12 w-full gap-1.5 rounded-2xl text-sm font-bold"
              disabled={!canGive}
              onClick={async () => {
                if (!gift || !canGive) return;
                const ok = await onGive(gift);
                if (ok) onOpenChange(false);
              }}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("engage.oshi.giftSending")}
                </>
              ) : gift ? (
                <>
                  {t("engage.oshi.giftConfirm", { gift: giftName(gift) })}
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs tabular-nums">
                    <PointIcon size={12} />
                    {gift.price}pt
                  </span>
                </>
              ) : (
                t("engage.oshi.giftTitle")
              )}
            </Button>
          )}
          <p className="mt-2 text-center text-3xs text-muted-foreground">{t("engage.oshi.giftNote")}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
