import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Heart,
  Gift,
  Star,
} from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { claimReward } from "@/hooks/useClaimReward";
import { StarterGoodsStep } from "./StarterGoodsStep";

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

// ──────────────────────────────────────────────
// ウェルカムフロー（4ステップ）
//   1. Welcome / 名前入力
//   2. 興味選択（おすすめの精度に使う）
//   3. はじめの1コレ: 推しの作品のグッズから、持っているものをタップして登録（写真を撮らずに数秒で）
//   4. 完了セレブレーション → /collection へ
//
// 以前はここに AIスタジオ / 探索 / コレクション の紹介スライドが3枚あった。
// 読む時点では指し示す対象が画面に無く、読み終えても何も残らないため外した。
// 機能の説明は各画面のスポットライトガイド（PageTourHost）が、実物の
// ボタンを光らせながら行う。ここは名前と興味だけ受け取って手短に終える。
// ──────────────────────────────────────────────

type Step = "welcome" | "interests" | "starter" | "celebrate";

/** 上部バー（戻る・進捗・スキップ）を出すステップ。 */
const BAR_STEPS: Step[] = ["interests", "starter"];

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const { user } = useAuth();
  const { completeWalkthrough, completeWelcome } = useOnboarding();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("welcome");
  const [direction, setDirection] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  // はじめの1コレで登録した数（締めの画面と、最後の行き先に使う）
  const [addedCount, setAddedCount] = useState(0);

  // 既存プロフィールの display_name をプリロード
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || data?.username || "");
        setIsLoadingProfile(false);
      });
  }, [user?.id]);

  // 敬称は名前側に付ける。文言テンプレートに「さん」を書いてしまうと、
  // 名前未入力のときに「あなたさん」という不自然な呼び方になってしまう。
  const friendlyName = useMemo(
    () =>
      displayName.trim()
        ? t("misc.onboarding.nameWithHonorific", { name: displayName.trim() })
        : t("misc.onboarding.you"),
    [displayName, t]
  );

  // 全ステップ順序とindex計算（プログレス表示用）
  const allSteps: Step[] = useMemo(
    () => ["welcome", "interests", "starter", "celebrate"],
    []
  );
  const stepIndex = allSteps.indexOf(step);
  const progress = ((stepIndex + 1) / allSteps.length) * 100;

  const goNext = useCallback(() => {
    setDirection(1);
    const next = allSteps[stepIndex + 1];
    if (next) setStep(next);
  }, [allSteps, stepIndex]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    const prev = allSteps[stepIndex - 1];
    if (prev) setStep(prev);
  }, [allSteps, stepIndex]);

  // 上部の「スキップ」: 興味の選択は飛ばして次（はじめの1コレ）へ。はじめの1コレを飛ばすと締めの画面へ。
  const skipToEnd = useCallback(() => {
    setDirection(1);
    setStep(step === "interests" ? "starter" : "celebrate");
  }, [step]);

  // Welcome → display_name保存 → interests
  const handleWelcomeNext = useCallback(async () => {
    if (user?.id && displayName.trim()) {
      try {
        await supabase
          .from("profiles")
          .update({ display_name: displayName.trim() })
          .eq("id", user.id);
      } catch (e) {
        console.error("Failed to save display name:", e);
      }
    }
    goNext();
  }, [user?.id, displayName, goNext]);

  const handleFinish = useCallback(async () => {
    // ようこそボーナス。付与額と「生涯1回」の判定はサーバー側が持つ。
    if (user?.id) {
      await claimReward("welcome_bonus");
    }
    completeWalkthrough();
    await completeWelcome();
    onComplete();
    // 最初の体験を「1つ登録する」にする。コレクションが空のままだと
    // 部屋生成も交換も中身が無く、どの機能も意味を持たない。
    // 以前もここへ送っていたが説明がゼロだったので離脱していた。
    // いまは /quick-add 側のガイドが撮り方と逃げ道を実物の上で説明する。
    // 1つでも登録していれば、できあがったコレクションを見せる。何も選ばなかった人だけ登録画面へ。
    navigate(addedCount > 0 ? "/collection" : "/quick-add");
  }, [user?.id, completeWalkthrough, completeWelcome, onComplete, navigate, addedCount]);


  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-hidden">
      <FloatingEmojis />

      {/* 上部プログレスバー（welcome / interests / celebrate以外で表示） */}
      {BAR_STEPS.includes(step) && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              aria-label={t("misc.common.back")}
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand-gradient"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <button
              onClick={skipToEnd}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              {t("misc.common.skip")}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        {step === "welcome" && (
          <WelcomeStep
            key="welcome"
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onNext={handleWelcomeNext}
            isLoading={isLoadingProfile}
          />
        )}

        {step === "interests" && (
          <InterestsStep
            key="interests"
            friendlyName={friendlyName}
            onDone={goNext}
            onSkip={goNext}
          />
        )}




        {step === "starter" && (
          <StarterGoodsStep
            key="starter"
            onDone={(count) => {
              setAddedCount(count);
              goNext();
            }}
            onPhoto={() => {
              // 写真から登録したい人は、このウェルカムを終えて登録画面へ
              setAddedCount(0);
              setStep("celebrate");
            }}
          />
        )}

        {step === "celebrate" && (
          <CelebrateStep key="celebrate" friendlyName={friendlyName} addedCount={addedCount} onFinish={handleFinish} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== Step 1: Welcome / 名前入力 ====================

function WelcomeStep({
  displayName,
  onDisplayNameChange,
  onNext,
  isLoading,
}: {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onNext: () => void;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col items-center justify-center px-6 relative z-10"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 60, delay: 0.1 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 rounded-full blur-3xl bg-brand-gradient opacity-40 scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-brand-gradient flex items-center justify-center shadow-2xl">
          <Sparkles className="w-12 h-12 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-4xl sm:text-5xl font-bold text-center mb-3 text-brand-gradient"
      >
        {/* 狭い画面で「ようこ／そ」と不自然に折り返さないよう語境界で改行 */}
        <span className="inline-block">{t("misc.onboarding.welcomeLine1")}</span>
        <span className="inline-block">{t("misc.onboarding.welcomeLine2")}</span>
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-center text-muted-foreground mb-10 max-w-sm"
      >
        {t("misc.onboarding.tagline")}
        <br />
        {t("misc.onboarding.askName")}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm"
      >
        <Input
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder={t("misc.onboarding.namePlaceholder")}
          disabled={isLoading}
          maxLength={30}
          className="h-14 text-lg text-center rounded-2xl border-2 focus-visible:ring-2 focus-visible:ring-primary/40 mb-3"
          autoFocus
        />
        {displayName.trim() && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-primary font-medium mb-6"
          >
            {t("misc.onboarding.greeting", { name: displayName.trim() })}
          </motion.p>
        )}

        <Button
          onClick={onNext}
          disabled={isLoading}
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl shadow-lg gap-2 bg-brand-gradient hover:opacity-95"
        >
          {t("misc.onboarding.start")}
          <ArrowRight className="w-5 h-5" />
        </Button>

        {!displayName.trim() && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {t("misc.onboarding.setLater")}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ==================== Step 2: 興味選択 ====================

function InterestsStep({
  friendlyName,
  onDone,
  onSkip,
}: {
  friendlyName: string;
  onDone: () => void;
  onSkip: () => void;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col relative z-10"
    >
      {/* スキップは上部バー（BAR_STEPS）にあるので、ここには置かない（重なって二重に見えていた） */}
      <div className="flex-1 overflow-auto">
        {/* 上部バー（戻る・進捗・スキップ）の下から始める。py-8 だとハートが進捗バーに重なっていた */}
        <div className="max-w-lg mx-auto px-4 pt-16 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {t("misc.onboarding.interestsTitle", { name: friendlyName })}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("misc.onboarding.interestsSubtitle")}
            </p>
          </motion.div>
          <InitialInterestSelection onComplete={onDone} standalone />
        </div>
      </div>
    </motion.div>
  );
}

// ==================== Step 6: お祝い画面 ====================

function CelebrateStep({
  friendlyName,
  addedCount,
  onFinish,
}: {
  friendlyName: string;
  addedCount: number;
  onFinish: () => void;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center px-6 relative overflow-hidden z-10"
    >
      <Confetti />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 80, delay: 0.2 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 rounded-full blur-3xl bg-brand-gradient opacity-60 scale-150" />
        <div className="relative w-32 h-32 rounded-full bg-brand-gradient flex items-center justify-center shadow-2xl">
          <Gift className="w-16 h-16 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center mb-3"
      >
        {t("misc.onboarding.readyTitle")}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-muted-foreground mb-6 max-w-xs"
      >
        {t("misc.onboarding.readyDesc", { name: friendlyName })}
        {addedCount > 0 && (
          <>
            <br />
            <span className="font-bold text-foreground">{t("misc.onboarding.starter.addedSummary", { n: addedCount })}</span>
          </>
        )}
      </motion.p>

      {/* ようこそギフト */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="bg-points-soft border border-points/30 rounded-2xl px-5 py-4 mb-8 max-w-sm w-full"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{t("misc.onboarding.welcomeBonus")}</p>
            <p className="text-xs text-muted-foreground">{t("misc.onboarding.welcomeBonusDesc")}</p>
          </div>
          <div className="text-2xl font-bold tabular-nums text-points">+50</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="w-full max-w-sm"
      >
        <Button
          onClick={onFinish}
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl shadow-lg gap-2 bg-brand-gradient hover:opacity-95"
        >
          {/* 登録済みなら棚へ、まだなら登録画面へ（handleFinish の行き先と揃える） */}
          {t(addedCount > 0 ? "misc.onboarding.goToCollection" : "misc.onboarding.goRegisterFirst")}
          <ArrowRight className="w-5 h-5" />
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          {t("misc.onboarding.continueNote")}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ==================== 装飾: 漂う絵文字 ====================

const EMOJIS = ["✨", "💖", "🌸", "⭐", "🎀", "💫", "🫧", "🌟"];

function FloatingEmojis() {
  const positions = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        left: (i * 37) % 100,
        delay: (i * 0.7) % 6,
        emoji: EMOJIS[i % EMOJIS.length],
        size: 16 + (i % 4) * 6,
        duration: 14 + (i % 5) * 3,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {positions.map((p, i) => (
        <motion.div
          key={i}
          className="absolute select-none"
          style={{
            left: `${p.left}%`,
            bottom: "-10%",
            fontSize: `${p.size}px`,
            opacity: 0.5,
          }}
          animate={{
            y: ["0vh", "-110vh"],
            rotate: [0, 360],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ==================== 装飾: Confetti ====================

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        left: (i * 29) % 100,
        delay: (i * 0.15) % 2,
        color: ["#ec4899", "#a855f7", "#f59e0b", "#10b981", "#3b82f6"][i % 5],
        size: 8 + (i % 3) * 4,
        rotate: (i * 73) % 360,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: "-5%",
            width: `${p.size}px`,
            height: `${p.size * 0.4}px`,
            background: p.color,
            borderRadius: "2px",
          }}
          initial={{ y: 0, rotate: p.rotate, opacity: 1 }}
          animate={{
            y: ["0vh", "110vh"],
            rotate: [p.rotate, p.rotate + 720],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 3 + (i % 3),
            delay: p.delay,
            ease: [0.2, 0.8, 0.4, 1],
            times: [0, 0.8, 1],
          }}
        />
      ))}
    </div>
  );
}
