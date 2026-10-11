import { useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Camera, Check, Gift, Hand, Heart, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { LazyImage } from "@/components/ui/lazy-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
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
import { frameClass, levelProgress, todayJst } from "@/utils/companion";
import { cn } from "@/lib/utils";

interface CompanionCardProps {
  companion: Companion;
  /** 「撮る」を押したとき（この相棒を選んだ状態で写真の画面を開く） */
  onPhoto: (companion: Companion) => void;
  onRemove: (companion: Companion) => void;
}

type CareAction = "pat" | "polish";

/** 1回の反応で出す飾り（ハート・きらめき・+xp）。位置は毎回少しずらして、生きている感じを出す */
interface Burst {
  id: number;
  kind: CareAction | "gift";
  xp: number;
}

// 各行動の色。状態色ではなく、行動を見分けるための色なのでトークンではなく固定にする
/* eslint-disable no-restricted-syntax -- 行動を見分けるための装飾の色 */
const ACTION_TONE = {
  pat: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  polish: "bg-amber-400/15 text-amber-700 dark:text-amber-300",
  photo: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
} as const;
/* eslint-enable no-restricted-syntax */

/**
 * 相棒グッズ。撫でる・磨く・撮る を1日に1回ずつすると、なかよし度（xp）が増えてレベルが上がる。
 * レベルに応じて枠が華やかになる。放置しても減らない。
 *
 * 触った手応えを大事にする:
 * - 撫でる: 画像そのものをタップしても撫でられる。ふにっと揺れて、ハートが舞う
 * - 磨く: 画像に光の帯が走り、きらめきが出る
 * - どちらも「+1」が浮かび、なかよし度のバーが伸びる
 * - プレゼント: ポイントで贈る（毎日のお世話とは別。1日の回数に上限）。贈ると跳ねて、ハートと「+xp」が出る
 */
export function CompanionCard({ companion, onPhoto, onRemove }: CompanionCardProps) {
  const { t } = useLanguage();
  const care = useCareCompanion();
  const give = useGiveCompanionGift();
  const giftKinds = useCompanionGiftKinds();
  const giftCounts = useTodayGiftCounts();
  const navigate = useNavigate();
  const [giftOpen, setGiftOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const imageControls = useAnimationControls();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [shine, setShine] = useState(0);
  const today = todayJst();
  const progress = levelProgress(companion.xp);
  const patDone = companion.last_pat_on === today;
  const polishDone = companion.last_polish_on === today;
  const photoDone = companion.last_photo_on === today;
  const doneCount = [patDone, polishDone, photoDone].filter(Boolean).length;
  // 今日あと何回プレゼントを贈れるか（種類の合計）。上限はサーバーが確かめる
  const giftLeft = (giftKinds.data ?? []).reduce(
    (sum, g) => sum + Math.max(0, g.daily_limit - (giftCounts.data?.[`${companion.user_item_id}:${g.kind}`] ?? 0)),
    0
  );

  const react = (kind: CareAction | "gift", xp = 1) => {
    const id = Date.now() + Math.random();
    setBursts((prev) => [...prev, { id, kind, xp }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1400);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
    if (reduceMotion) return;
    if (kind === "gift") {
      // 受け取って、うれしそうに跳ねる
      setShine((n) => n + 1);
      void imageControls.start({
        y: [0, -10, 0, -4, 0],
        scale: [1, 1.06, 0.98, 1.02, 1],
        transition: { duration: 0.7, ease: "easeOut" },
      });
    } else if (kind === "pat") {
      // ふにっと縮んで、左右に小さく揺れる
      void imageControls.start({
        scale: [1, 0.93, 1.05, 1],
        rotate: [0, -3, 3, 0],
        transition: { duration: 0.55, ease: "easeOut" },
      });
    } else {
      setShine((n) => n + 1);
      void imageControls.start({ scale: [1, 1.03, 1], transition: { duration: 0.6 } });
    }
  };

  const handleCare = async (action: CareAction) => {
    if (care.isPending) return;
    if ((action === "pat" && patDone) || (action === "polish" && polishDone)) return;
    // 押した瞬間に反応する（通信を待つと、触った感じがしない）
    react(action);
    try {
      const result = await care.mutateAsync({ itemId: companion.user_item_id, action });
      if (result.already) return;
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

  /** プレゼントを贈る。成功したら true（シートを閉じる） */
  const handleGive = async (gift: GiftKind): Promise<boolean> => {
    if (give.isPending) return false;
    const giftName = t(`engage.oshi.giftKind.${gift.kind}.name`);
    try {
      const result = await give.mutateAsync({ itemId: companion.user_item_id, kind: gift.kind });
      // シートが閉じてから演出が見えるよう、少しだけ待つ
      setTimeout(() => react("gift", result.gain), reduceMotion ? 0 : 220);
      if (result.leveled_up && result.level) {
        toast.success(t("engage.oshi.levelUp", { name: companion.title, level: result.level }), {
          description: t(`engage.oshi.levelTitle.${result.level}`),
          duration: 6000,
        });
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
    <div className="overflow-hidden rounded-2xl border bg-card p-4">
      <div className="flex gap-4">
        {/* 画像。タップで撫でる */}
        <div className="relative shrink-0">
          <motion.button
            type="button"
            animate={imageControls}
            whileTap={reduceMotion || patDone ? undefined : { scale: 0.95 }}
            onClick={() => handleCare("pat")}
            disabled={patDone}
            aria-label={patDone ? t("engage.oshi.patDoneAria", { name: companion.title }) : t("engage.oshi.patAria", { name: companion.title })}
            className={cn(
              "block rounded-2xl p-[3px] transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              frameClass(progress.level),
              !patDone && "cursor-pointer"
            )}
          >
            <span className="relative block h-28 w-28 overflow-hidden rounded-[13px] bg-muted">
              <LazyImage src={companion.image} alt="" className="h-full w-full object-cover" />
              {/* 磨く: 光の帯が斜めに走る */}
              <AnimatePresence>
                {shine > 0 && (
                  <motion.span
                    key={shine}
                    initial={{ x: "-120%" }}
                    // 帯の幅は画像の半分なので、自分の幅の 260% 動かして画像の外まで抜ける。
                    // 以前は 120% で止まり、止まった位置が画像の真ん中で、白い帯が残ったままになっていた
                    animate={{ x: "260%" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                    aria-hidden="true"
                  />
                )}
              </AnimatePresence>
              {/* 下はレベルの札と重なるので、案内は上に出す */}
              {!patDone && (
                <span className="pointer-events-none absolute left-1/2 top-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-2 py-0.5 text-3xs font-bold text-white backdrop-blur-sm">
                  {t("engage.oshi.tapToPat")}
                </span>
              )}
            </span>
          </motion.button>

          {/* ハート・きらめき・+xp */}
          <AnimatePresence>
            {bursts.map((b) => (
              <BurstFx key={b.id} burst={b} reduceMotion={!!reduceMotion} />
            ))}
          </AnimatePresence>

          <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-2xs font-bold tabular-nums text-primary-foreground shadow">
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
              className="-mr-1 -mt-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs font-medium text-primary">{t(`engage.oshi.levelTitle.${progress.level}`)}</p>

          <div className="mt-2" aria-label={t("engage.oshi.xpLabel")}>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-brand-gradient"
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

          {/* 今日のお世話（3つの点） */}
          <div className="mt-2 flex items-center gap-1.5" aria-label={t("engage.oshi.todayCareAria", { n: doneCount })}>
            {[patDone, polishDone, photoDone].map((done, i) => (
              <span
                key={i}
                className={cn("h-1.5 w-5 rounded-full transition-colors", done ? "bg-primary" : "bg-muted")}
                aria-hidden="true"
              />
            ))}
            <span className="ml-1 text-2xs text-muted-foreground">
              {doneCount === 3 ? t("engage.oshi.todayAllDone") : t("engage.oshi.todayCareShort", { n: doneCount })}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <CareButton
          icon={<Hand className="h-5 w-5" />}
          tone={ACTION_TONE.pat}
          label={t("engage.oshi.pat")}
          xp="+1"
          done={patDone}
          busy={care.isPending}
          onClick={() => handleCare("pat")}
          doneLabel={t("engage.oshi.careDone")}
        />
        <CareButton
          icon={<Sparkles className="h-5 w-5" />}
          tone={ACTION_TONE.polish}
          label={t("engage.oshi.polish")}
          xp="+1"
          done={polishDone}
          busy={care.isPending}
          onClick={() => handleCare("polish")}
          doneLabel={t("engage.oshi.careDone")}
        />
        <CareButton
          icon={<Camera className="h-5 w-5" />}
          tone={ACTION_TONE.photo}
          label={t("engage.oshi.shoot")}
          xp="+3"
          done={photoDone}
          busy={false}
          onClick={() => onPhoto(companion)}
          doneLabel={t("engage.oshi.careDone")}
        />
        {/* プレゼント（ポイントで贈る）。お世話とちがい1日に何回か贈れるので、終わっても「チェック」にはしない */}
        <CareButton
          icon={<Gift className="h-5 w-5" />}
          tone="bg-points-soft text-points"
          label={t("engage.oshi.gift")}
          xp={progress.isMax ? t("engage.oshi.giftMaxShort") : giftKinds.data ? t("engage.oshi.giftLeft", { n: giftLeft }) : ""}
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
        />
      </div>

      <CompanionGiftSheet
        open={giftOpen}
        onOpenChange={setGiftOpen}
        companion={companion}
        onGive={handleGive}
        busy={give.isPending}
      />
    </div>
  );
}

/** 撫でたときのハート／磨いたときのきらめきと、「+1」の浮かび上がり */
function BurstFx({ burst, reduceMotion }: { burst: Burst; reduceMotion: boolean }) {
  // プレゼントは絵文字ではなくアイコン（アプリのアイコンの決まりに合わせる）
  const symbols: React.ReactNode[] =
    burst.kind === "gift"
      ? [
          <Heart key="a" className="h-5 w-5 fill-primary text-primary" />,
          <Gift key="b" className="h-5 w-5 text-points" />,
          <Heart key="c" className="h-4 w-4 fill-primary text-primary" />,
        ]
      : burst.kind === "pat"
        ? ["💗", "💕", "💗"]
        : ["✨", "⭐", "✨"];
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {!reduceMotion &&
        symbols.map((s, i) => {
          const dx = (i - 1) * 26 + (burst.id % 7) - 3;
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 0, y: 10, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], x: dx, y: -60 - i * 8, scale: [0.6, 1.15, 0.9] }}
              transition={{ duration: 1.1, delay: i * 0.08, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 text-xl"
            >
              {s}
            </motion.span>
          );
        })}
      <motion.span
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, 1, 1, 0], y: -28 }}
        transition={{ duration: 1.2 }}
        className="absolute right-0 top-8 rounded-full bg-primary px-1.5 py-0.5 text-2xs font-bold tabular-nums text-primary-foreground shadow"
      >
        +{burst.xp}
      </motion.span>
    </span>
  );
}

function CareButton({
  icon,
  tone,
  label,
  xp,
  done,
  busy,
  onClick,
  doneLabel,
  ariaLabel,
  subMuted = false,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  xp: string;
  done: boolean;
  busy: boolean;
  onClick: () => void;
  doneLabel: string;
  ariaLabel?: string;
  /** 下の小さな文字を目立たせない（プレゼントを贈りきった・最大レベル） */
  subMuted?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={done || busy ? undefined : { scale: 0.94 }}
      disabled={done || busy}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
        done ? "border-transparent bg-muted/60" : "bg-card hover:bg-accent disabled:opacity-70"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          done ? "bg-primary text-primary-foreground" : tone
        )}
        aria-hidden="true"
      >
        {done ? <Check className="h-5 w-5" /> : icon}
      </span>
      <span className="text-xs font-bold">{label}</span>
      <span className={cn("text-3xs tabular-nums", done || subMuted ? "text-muted-foreground" : "font-bold text-points")}>
        {done ? doneLabel : `${xp}`}
      </span>
    </motion.button>
  );
}
