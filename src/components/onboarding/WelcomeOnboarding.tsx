import { useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence, MotionConfig, type Variants } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, Heart, Package, Sparkles, Star } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { claimReward } from "@/hooks/useClaimReward";
import { cn } from "@/lib/utils";
import { StarterGoodsStep } from "./StarterGoodsStep";
import { OnboardingBottomBar, OnboardingPrimaryButton, OnboardingStepHeader } from "./OnboardingParts";

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
//
// 見た目はアプリ本体に揃える: 上はアプリのヘッダーと同じ「左にロゴ・右に操作」＋細い進捗バー、
// 中身は bg-card のカードと primary 単色、主ボタンは画面下に固定。
// 以前の、漂う絵文字・紙吹雪・発光するグラデーションの丸は外した。
// ──────────────────────────────────────────────

type Step = "welcome" | "interests" | "starter" | "celebrate";

/** 戻る・スキップを出すステップ。ロゴと進捗バーはすべてのステップで出す */
const BAR_STEPS: Step[] = ["interests", "starter"];

/**
 * ステップの切り替え。進む向きに少しだけ横へずらして入れ替える。
 * 動きを減らす設定の人には、MotionConfig(reducedMotion="user") が移動を止め、薄く切り替えるだけにする。
 */
const stepVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

/** 各ステップの外枠。ヘッダーの下を埋める縦並び（中身のスクロール＋下の固定バー） */
function StepFrame({ direction, children }: { direction: number; children: ReactNode }) {
  return (
    <motion.div
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute inset-0 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

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

  const showBar = BAR_STEPS.includes(step);

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 z-[100] flex flex-col bg-background">
        {/* アプリのヘッダーと同じ形: 左にロゴ、右にスキップ。下に細い進捗バー */}
        <header className="shrink-0 border-b bg-background pt-[env(safe-area-inset-top)]">
          <div className={cn("mx-auto flex h-12 max-w-lg items-center gap-1 pr-2", showBar ? "pl-1" : "pl-4")}>
            {showBar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goPrev}
                className="h-10 w-10 rounded-full text-muted-foreground"
                aria-label={t("misc.common.back")}
              >
                <ChevronLeft className="!size-5" />
              </Button>
            )}
            <span className="logo-text text-xl">Collectify</span>
            <div className="flex-1" />
            {showBar && (
              <Button variant="ghost" size="sm" onClick={skipToEnd} className="text-muted-foreground">
                {t("misc.common.skip")}
              </Button>
            )}
          </div>
          <div
            className="h-1 overflow-hidden bg-muted"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={allSteps.length}
            aria-valuenow={stepIndex + 1}
          >
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {step === "welcome" && (
              <StepFrame key="welcome" direction={direction}>
                <WelcomeStep
                  displayName={displayName}
                  onDisplayNameChange={setDisplayName}
                  onNext={handleWelcomeNext}
                  isLoading={isLoadingProfile}
                />
              </StepFrame>
            )}

            {step === "interests" && (
              <StepFrame key="interests" direction={direction}>
                <InterestsStep friendlyName={friendlyName} onDone={goNext} />
              </StepFrame>
            )}

            {step === "starter" && (
              <StepFrame key="starter" direction={direction}>
                <StarterGoodsStep
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
              </StepFrame>
            )}

            {step === "celebrate" && (
              <StepFrame key="celebrate" direction={direction}>
                <CelebrateStep friendlyName={friendlyName} addedCount={addedCount} onFinish={handleFinish} />
              </StepFrame>
            )}
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
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
  const name = displayName.trim();
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 pb-6 pt-8">
          <OnboardingStepHeader
            icon={Sparkles}
            title={
              <>
                {/* 狭い画面で「ようこ／そ」と不自然に折り返さないよう語境界で改行 */}
                <span className="inline-block">{t("misc.onboarding.welcomeLine1")}</span>
                <span className="inline-block">{t("misc.onboarding.welcomeLine2")}</span>
              </>
            }
            description={t("misc.onboarding.tagline")}
          />

          <div className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
            <label htmlFor="onboarding-name" className="text-sm font-bold">
              {t("misc.onboarding.askName")}
            </label>
            <Input
              id="onboarding-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder={t("misc.onboarding.namePlaceholder")}
              disabled={isLoading}
              maxLength={30}
              className="mt-2 h-12 rounded-xl text-base"
              autoFocus
            />
            <p className="mt-2 min-h-4 text-xs text-muted-foreground" aria-live="polite">
              {name ? (
                <span className="font-medium text-foreground">{t("misc.onboarding.greeting", { name })}</span>
              ) : (
                t("misc.onboarding.setLater")
              )}
            </p>
          </div>
        </div>
      </div>

      <OnboardingBottomBar>
        <OnboardingPrimaryButton onClick={onNext} disabled={isLoading}>
          {t("misc.onboarding.start")}
          <ArrowRight />
        </OnboardingPrimaryButton>
      </OnboardingBottomBar>
    </>
  );
}

// ==================== Step 2: 興味選択 ====================

function InterestsStep({ friendlyName, onDone }: { friendlyName: string; onDone: () => void }) {
  const { t } = useLanguage();
  // 検索・一覧・下の「次へ」ボタンは InitialInterestSelection が持つ。見出しだけここから渡す
  return (
    <InitialInterestSelection
      onComplete={onDone}
      standalone
      header={
        <OnboardingStepHeader
          icon={Heart}
          title={t("misc.onboarding.interestsTitle", { name: friendlyName })}
          description={t("misc.onboarding.interestsSubtitle")}
        />
      }
    />
  );
}

// ==================== Step 4: お祝い画面 ====================

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
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 pb-6 pt-12 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success"
          >
            <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
          </motion.div>

          <h2 className="mt-4 text-2xl font-bold">{t("misc.onboarding.readyTitle")}</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {t("misc.onboarding.readyDesc", { name: friendlyName })}
          </p>

          <div className="mt-6 w-full space-y-3 text-left">
            {addedCount > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="min-w-0 flex-1 text-sm font-bold">
                  {t("misc.onboarding.starter.addedSummary", { n: addedCount })}
                </p>
              </div>
            )}

            {/* ようこそボーナス（付与額と「生涯1回」の判定はサーバー側） */}
            <div className="flex items-center gap-3 rounded-2xl border border-points/30 bg-points-soft p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-points text-points-foreground">
                <Star className="h-5 w-5 fill-current" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{t("misc.onboarding.welcomeBonus")}</p>
                <p className="text-xs text-muted-foreground">{t("misc.onboarding.welcomeBonusDesc")}</p>
              </div>
              <p className="shrink-0 text-xl font-bold tabular-nums text-points">
                +50<span className="ml-0.5 text-xs">pt</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <OnboardingBottomBar>
        <OnboardingPrimaryButton onClick={onFinish}>
          {/* 登録済みなら棚へ、まだなら登録画面へ（handleFinish の行き先と揃える） */}
          {t(addedCount > 0 ? "misc.onboarding.goToCollection" : "misc.onboarding.goRegisterFirst")}
          <ArrowRight />
        </OnboardingPrimaryButton>
        <p className="mt-2 text-center text-2xs text-muted-foreground">{t("misc.onboarding.continueNote")}</p>
      </OnboardingBottomBar>
    </>
  );
}
