import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  giftErrorCode,
  useCareCompanion,
  useCompanionGiftKinds,
  useGiveCompanionGift,
  useTodayGiftCounts,
  type Companion,
  type GiftKind,
} from "@/hooks/useOshi";
import { CompanionGiftSheet } from "@/components/oshi/CompanionGiftSheet";
import { RankBadge } from "@/components/oshi/RankBadge";
import { levelProgress, todayJst } from "@/utils/companion";
import { cn } from "@/lib/utils";
import { CameraArt, ClothArt, GiftArt, HandArt } from "./art/FxArt";
import type { RoomFxEvent } from "./fx";

interface GoodsCarePanelProps {
  companion: Companion;
  /** 部屋の上で演出を出す */
  onFx: (e: Omit<RoomFxEvent, "id">) => void;
  /** 撮る（演出のあと、撮影の画面を開く） */
  onPhoto: (c: Companion) => void;
  /** レベルが上がった（部屋じゅうでお祝いする） */
  onLevelUp: (level: number, c: Companion) => void;
  /** パネルの頭に出すもの（推しグッズの切り替え） */
  header?: React.ReactNode;
  /** グッズの詳細を開く */
  onDetail?: () => void;
}

type CareAction = "pat" | "polish";

/**
 * 部屋でタップしたグッズのパネル。名前・Lv・称号・なかよし度のバー・今日のお世話と、お世話の4つのボタン。
 * お世話の手応えは部屋の上の演出（RoomFx）で見せる。押した瞬間に演出を始め、通信は後から追いかける
 * （以前のカードと同じ。待ってから動くと、触った感じがしない）。
 * 回数の上限・エラー・トースト・ショップへの導線は、以前のカード（CompanionCard）と同じ。
 */
export function GoodsCarePanel({ companion, onFx, onPhoto, onLevelUp, header, onDetail }: GoodsCarePanelProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const care = useCareCompanion();
  const give = useGiveCompanionGift();
  const giftKinds = useCompanionGiftKinds();
  const giftCounts = useTodayGiftCounts();
  const [giftOpen, setGiftOpen] = useState(false);
  const today = todayJst();
  const progress = levelProgress(companion.xp);
  const patDone = companion.last_pat_on === today;
  const polishDone = companion.last_polish_on === today;
  const photoDone = companion.last_photo_on === today;
  const doneCount = [patDone, polishDone, photoDone].filter(Boolean).length;
  const giftLeft = (giftKinds.data ?? []).reduce(
    (sum, g) => sum + Math.max(0, g.daily_limit - (giftCounts.data?.[`${companion.user_item_id}:${g.kind}`] ?? 0)),
    0
  );

  const levelUp = (level: number) => {
    onLevelUp(level, companion);
    toast.success(t("engage.oshi.levelUp", { name: companion.title, level }), {
      description: t(`engage.oshi.levelTitle.${level}`),
      duration: 6000,
    });
  };

  const handleCare = async (action: CareAction) => {
    if (care.isPending) return;
    if ((action === "pat" && patDone) || (action === "polish" && polishDone)) return;
    onFx({ kind: action, item: companion.user_item_id, xp: 1 });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
    try {
      const result = await care.mutateAsync({ itemId: companion.user_item_id, action });
      if (result.already) return;
      // お祝いは、なでる・みがくの演出が終わるころに
      if (result.leveled_up && result.level) {
        const level = result.level;
        window.setTimeout(() => levelUp(level), reduceMotion ? 0 : 1100);
      }
    } catch (e) {
      console.error("care failed:", e);
      toast.error(t("engage.oshi.careFailed"));
    }
  };

  const handlePhoto = () => {
    onFx({ kind: "photo", item: companion.user_item_id });
    // フラッシュとシャッターのあとに、撮影の画面を開く
    window.setTimeout(() => onPhoto(companion), reduceMotion ? 150 : 850);
  };

  /** プレゼントを贈る。成功したら true（シートを閉じる） */
  const handleGive = async (gift: GiftKind): Promise<boolean> => {
    if (give.isPending) return false;
    const giftName = t(`engage.oshi.giftKind.${gift.kind}.name`);
    try {
      const result = await give.mutateAsync({ itemId: companion.user_item_id, kind: gift.kind });
      // シートが閉じてから演出が見えるよう、少しだけ待つ
      window.setTimeout(() => onFx({ kind: "gift", item: companion.user_item_id, xp: result.gain, gift: gift.kind }), reduceMotion ? 0 : 260);
      if (result.leveled_up && result.level) {
        const level = result.level;
        window.setTimeout(() => levelUp(level), reduceMotion ? 0 : 2100);
      } else {
        toast.success(t("engage.oshi.giftDone", { name: companion.title, gift: giftName }), {
          description: t("engage.oshi.giftDoneDesc", { xp: result.gain }),
        });
      }
      return true;
    } catch (e) {
      const code = giftErrorCode(e);
      if (code === "insufficient_points") {
        toast.error(t("engage.oshi.giftInsufficient"), {
          action: { label: t("engage.oshi.giftToShop"), onClick: () => navigate("/point-shop") },
        });
      } else if (code === "gift_daily_limit") {
        toast.error(t("engage.oshi.giftLimit"));
      } else if (code === "max_level") {
        toast.error(t("engage.oshi.giftMax"));
      } else {
        console.error("gift failed:", e);
        toast.error(t("engage.oshi.careFailed"));
      }
      return false;
    }
  };

  return (
    <>
      {/* お世話のボタンは、部屋の下端に少し重ねたバーにする。
          以前はパネルのいちばん下にあり、スマホでは毎日の主な操作なのにスクロールしないと押せなかった */}
      <div
        className="relative z-10 -mt-7 mx-2 rounded-3xl border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm md:mx-0 md:mt-0 md:bg-card md:p-2 md:shadow-sm md:backdrop-blur-none"
        role="group"
        aria-label={t("oshiRoom.panelAria", { name: companion.title })}
      >
        <div className="grid grid-cols-4 gap-1.5">
          <CareButton art={<HandArt className="h-full w-full" />} label={t("engage.oshi.pat")} sub="+1" done={patDone} busy={care.isPending} onClick={() => handleCare("pat")} doneLabel={t("engage.oshi.careDone")} tone="pat" ariaLabel={patDone ? t("engage.oshi.patDoneAria", { name: companion.title }) : t("engage.oshi.patAria", { name: companion.title })} />
          <CareButton art={<ClothArt className="h-full w-full" />} label={t("engage.oshi.polish")} sub="+1" done={polishDone} busy={care.isPending} onClick={() => handleCare("polish")} doneLabel={t("engage.oshi.careDone")} tone="polish" />
          <CareButton art={<CameraArt className="h-full w-full" />} label={t("engage.oshi.shoot")} sub="+3" done={photoDone} busy={false} onClick={handlePhoto} doneLabel={t("engage.oshi.careDone")} tone="photo" />
          {/* プレゼント（ポイントで贈る）。お世話とちがい1日に何回か贈れるので、終わっても「チェック」にはしない */}
          <CareButton
            art={<GiftArt className="h-full w-full" />}
            label={t("engage.oshi.gift")}
            sub={progress.isMax ? t("engage.oshi.giftMaxShort") : giftKinds.data ? t("engage.oshi.giftLeft", { n: giftLeft }) : ""}
            done={false}
            busy={give.isPending}
            onClick={() => {
              // 前のレベルアップの通知が残っていると、シートの「贈る」ボタンに重なる
              toast.dismiss();
              setGiftOpen(true);
            }}
            doneLabel={t("engage.oshi.careDone")}
            ariaLabel={t("engage.oshi.giftAria", { name: companion.title })}
            subMuted={progress.isMax || giftLeft === 0}
            tone="gift"
          />
        </div>
      </div>

      <section className="rounded-3xl border bg-card px-4 pb-3 pt-3 shadow-sm" aria-label={t("oshiRoom.panelAria", { name: companion.title })}>
        <div className="flex items-center gap-2.5">
          <RankBadge rank={companion.rank} className="mt-0.5 shrink-0" />
          {/* 名前の行を押すとグッズの詳細が開く（部屋の中の選んでいるグッズを、もう一度タップしても開く） */}
          <button
            type="button"
            onClick={onDetail}
            disabled={!onDetail}
            className="group -my-1 -ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none"
            aria-label={t("oshiRoom.detailAria", { name: companion.title })}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold leading-snug">
                <span className="sr-only">{t("engage.oshi.rankAria", { rank: companion.rank })} </span>
                {companion.title}
              </span>
              <span className="mt-0.5 block text-xs font-bold text-primary">{t(`engage.oshi.levelTitle.${progress.level}`)}</span>
            </span>
            {onDetail && (
              <span className="inline-flex shrink-0 items-center text-2xs font-bold text-muted-foreground group-hover:text-foreground" aria-hidden="true">
                {t("oshiRoom.detail")}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-black tabular-nums text-primary-foreground shadow-sm">Lv.{progress.level}</span>
        </div>

        <div className="mt-2" aria-label={t("engage.oshi.xpLabel")}>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-brand-gradient"
              initial={false}
              animate={{ width: `${Math.max(4, Math.round(progress.ratio * 100))}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-2xs text-muted-foreground">
            <span className="tabular-nums">{progress.isMax ? t("engage.oshi.maxLevel") : t("engage.oshi.nextLevel", { n: progress.needed - progress.into })}</span>
            <span className="flex items-center gap-1" aria-label={t("engage.oshi.todayCareAria", { n: doneCount })}>
              {[patDone, polishDone, photoDone].map((done, i) => (
                <span key={i} className={cn("h-1.5 w-4 rounded-full transition-colors", done ? "bg-primary" : "bg-muted")} aria-hidden="true" />
              ))}
              <span className="ml-0.5">{doneCount === 3 ? t("engage.oshi.todayAllDone") : t("engage.oshi.todayCareShort", { n: doneCount })}</span>
            </span>
          </div>
        </div>

        {header && <div className="-mx-1 mt-2.5 border-t pt-2">{header}</div>}
      </section>

      <CompanionGiftSheet open={giftOpen} onOpenChange={setGiftOpen} companion={companion} onGive={handleGive} busy={give.isPending} />
    </>
  );
}

/** ボタンの面の色。行動を見分けるための装飾なので、状態のトークンではなく固定のやわらかい色 */
/* eslint-disable no-restricted-syntax -- 行動を見分けるための装飾の色（以前のカードと同じ） */
const TONE = {
  pat: "bg-rose-500/10 dark:bg-rose-400/15",
  polish: "bg-sky-500/10 dark:bg-sky-400/15",
  photo: "bg-pink-500/10 dark:bg-pink-400/15",
  gift: "bg-points-soft",
} as const;
/* eslint-enable no-restricted-syntax */

function CareButton({
  art,
  label,
  sub,
  done,
  busy,
  onClick,
  doneLabel,
  ariaLabel,
  subMuted = false,
  tone,
}: {
  art: React.ReactNode;
  label: string;
  sub: string;
  done: boolean;
  busy: boolean;
  onClick: () => void;
  doneLabel: string;
  ariaLabel?: string;
  subMuted?: boolean;
  tone: keyof typeof TONE;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileTap={done || busy || reduceMotion ? undefined : { scale: 0.92, rotate: -2 }}
      whileHover={done || busy || reduceMotion ? undefined : { y: -2 }}
      disabled={done || busy}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-2xl border px-1 pb-1.5 pt-1.5 transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
        done ? "border-transparent bg-muted/60" : "bg-card hover:bg-accent disabled:opacity-70"
      )}
    >
      <span className={cn("relative flex h-9 w-9 items-center justify-center rounded-full p-1.5 md:h-11 md:w-11", done ? "bg-muted" : TONE[tone])} aria-hidden="true">
        <span className={cn("h-full w-full", done && "opacity-40 grayscale")}>{art}</span>
        {done && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="whitespace-nowrap text-xs font-bold leading-tight">{label}</span>
      <span className={cn("whitespace-nowrap text-3xs leading-none tabular-nums", done || subMuted ? "text-muted-foreground" : "font-bold text-points")}>{done ? doneLabel : sub}</span>
    </motion.button>
  );
}
