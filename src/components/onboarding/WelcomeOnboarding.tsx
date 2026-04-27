import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Heart,
  Package,
  Users,
  Gift,
  Star,
  Wand2,
  Search as SearchIcon,
  Compass,
  Check,
} from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

// ──────────────────────────────────────────────
// 新オンボーディングフロー（6ステップ）
//   1. Welcome / 名前入力
//   2. 興味選択
//   3. AIスタジオ紹介
//   4. 探索 紹介
//   5. コレクション 紹介
//   6. 完了セレブレーション → /search へ
// ──────────────────────────────────────────────

type Step = "welcome" | "interests" | "feature-ai" | "feature-explore" | "feature-collection" | "celebrate";

const FEATURE_STEPS: Step[] = ["feature-ai", "feature-explore", "feature-collection"];

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const { user } = useAuth();
  const { completeWalkthrough, completeWelcome } = useOnboarding();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("welcome");
  const [direction, setDirection] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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

  const friendlyName = useMemo(
    () => (displayName.trim() ? displayName.trim() : "あなた"),
    [displayName]
  );

  // 全ステップ順序とindex計算（プログレス表示用）
  const allSteps: Step[] = useMemo(
    () => ["welcome", "interests", ...FEATURE_STEPS, "celebrate"],
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

  const skipToEnd = useCallback(() => {
    setDirection(1);
    setStep("celebrate");
  }, []);

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
    // ようこそボーナス 50pt
    if (user?.id) {
      try {
        await supabase.rpc("add_user_points", {
          _user_id: user.id,
          _points: 50,
          _transaction_type: "welcome_bonus",
          _description: "ようこそボーナス",
        });
      } catch (e) {
        console.error("Failed to grant welcome bonus:", e);
      }
    }
    completeWalkthrough();
    await completeWelcome();
    onComplete();
    navigate("/search");
  }, [user?.id, completeWalkthrough, completeWelcome, onComplete, navigate]);

  // タッチスワイプ（機能紹介ステップで有効）
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else if (stepIndex > 0) goPrev();
    }
    setTouchStart(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      <FloatingEmojis />

      {/* 上部プログレスバー（welcome / interests / celebrate以外で表示） */}
      {FEATURE_STEPS.includes(step) && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              aria-label="戻る"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <button
              onClick={skipToEnd}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              スキップ
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

        {step === "feature-ai" && (
          <FeatureStep
            key="feature-ai"
            featureKey="ai"
            friendlyName={friendlyName}
            direction={direction}
            onNext={goNext}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {step === "feature-explore" && (
          <FeatureStep
            key="feature-explore"
            featureKey="explore"
            friendlyName={friendlyName}
            direction={direction}
            onNext={goNext}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {step === "feature-collection" && (
          <FeatureStep
            key="feature-collection"
            featureKey="collection"
            friendlyName={friendlyName}
            direction={direction}
            onNext={goNext}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {step === "celebrate" && (
          <CelebrateStep key="celebrate" friendlyName={friendlyName} onFinish={handleFinish} />
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
        <div className="absolute inset-0 rounded-full blur-3xl bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 opacity-40 scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-2xl">
          <Sparkles className="w-12 h-12 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-4xl sm:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent"
      >
        Collectifyへようこそ
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-center text-muted-foreground mb-10 max-w-sm"
      >
        推し活の全てを、ここに。
        <br />
        まずは、あなたのお名前を教えてください ✨
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
          placeholder="推し活ネームを入力..."
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
            こんにちは、{displayName.trim()}さん 👋
          </motion.p>
        )}

        <Button
          onClick={onNext}
          disabled={isLoading}
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 hover:opacity-95"
        >
          はじめる
          <ArrowRight className="w-5 h-5" />
        </Button>

        {!displayName.trim() && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            （あとでも設定できます）
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col relative z-10"
    >
      {/* 上部スキップ */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          スキップ
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {friendlyName}さんの「推し」は？
            </h2>
            <p className="text-muted-foreground text-sm">
              好きなコンテンツを選ぶと、ぴったりのグッズをおすすめします
            </p>
          </motion.div>
          <InitialInterestSelection onComplete={onDone} standalone />
        </div>
      </div>
    </motion.div>
  );
}

// ==================== Step 3-5: 機能紹介 ====================

type FeatureKey = "ai" | "explore" | "collection";

interface FeatureContent {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  gradient: string;
  accent: string;
  bullets: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; text: string }[];
  cta: string;
}

function getFeatureContent(key: FeatureKey, friendlyName: string): FeatureContent {
  switch (key) {
    case "ai":
      return {
        badge: "STEP 3 / 5 ・ AI スタジオ",
        title: "AIで推し部屋を\n生み出そう",
        subtitle: "Powered by AI Studio",
        description: `${friendlyName}さんのグッズから、AIがオリジナルの推し部屋やアバターを生成。世界に一つだけの推し空間が作れます。`,
        icon: Wand2,
        gradient: "from-violet-500 via-fuchsia-500 to-pink-500",
        accent: "#a855f7",
        bullets: [
          { icon: Sparkles, text: "グッズ写真からAIで部屋を自動生成" },
          { icon: Star, text: "オリジナルのAIアバターも作れる" },
          { icon: Gift, text: "初回は無料でお試しできます" },
        ],
        cta: "次へ",
      };
    case "explore":
      return {
        badge: "STEP 4 / 5 ・ 探索",
        title: "他の推し活仲間と\n出会おう",
        subtitle: "Discover & Connect",
        description: `他のコレクターのAI作品やコレクション、推しが同じ仲間を発見。気になる人をフォローして交流しよう。`,
        icon: Compass,
        gradient: "from-cyan-500 via-blue-500 to-indigo-500",
        accent: "#3b82f6",
        bullets: [
          { icon: Users, text: "推しが同じ仲間を見つけられる" },
          { icon: Heart, text: "AI作品やコレクションを保存" },
          { icon: SearchIcon, text: "ランキングや特集で新発見" },
        ],
        cta: "次へ",
      };
    case "collection":
      return {
        badge: "STEP 5 / 5 ・ コレクション",
        title: "推しグッズを\n大切に記録しよう",
        subtitle: "Your Collection",
        description: `持っているグッズを登録して一覧で管理。お気に入りTOP5でプロフィールを彩り、欲しいグッズもウィッシュリストに保存。`,
        icon: Package,
        gradient: "from-emerald-500 via-green-500 to-lime-500",
        accent: "#10b981",
        bullets: [
          { icon: Check, text: "持ってるグッズをワンタップ登録" },
          { icon: Star, text: "お気に入りTOP5でプロフを彩る" },
          { icon: Heart, text: "欲しいグッズはウィッシュリストへ" },
        ],
        cta: "完了する",
      };
  }
}

function FeatureStep({
  featureKey,
  friendlyName,
  direction,
  onNext,
  onTouchStart,
  onTouchEnd,
}: {
  featureKey: FeatureKey;
  friendlyName: string;
  direction: number;
  onNext: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  const content = getFeatureContent(featureKey, friendlyName);
  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -60 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="h-full flex flex-col relative z-10 pt-16"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          {/* バッジ */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 backdrop-blur-md border border-border/40 text-[11px] font-semibold text-muted-foreground mb-6"
          >
            {content.badge}
          </motion.div>

          {/* アイコン＋アニメーション */}
          <div className="relative mb-8">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "absolute inset-0 rounded-full blur-3xl bg-gradient-to-br opacity-60 scale-[1.8]",
                content.gradient
              )}
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "relative w-32 h-32 rounded-[40%] bg-gradient-to-br flex items-center justify-center shadow-2xl",
                content.gradient
              )}
            >
              <Icon className="w-16 h-16 text-white" strokeWidth={2.5} />
            </motion.div>

            {/* キラキラ */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${[10, 90, 15, 85][i]}%`,
                  top: `${[15, 20, 85, 75][i]}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  rotate: [0, 180, 360],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut",
                }}
              >
                <Sparkles className="w-5 h-5" style={{ color: content.accent }} />
              </motion.div>
            ))}
          </div>

          {/* タイトル */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl sm:text-4xl font-bold text-foreground whitespace-pre-line leading-tight mb-3"
          >
            {content.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-6"
          >
            {content.description}
          </motion.p>

          {/* 機能ハイライト */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full space-y-2"
          >
            {content.bullets.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${content.accent}20` }}
                  >
                    <BIcon className="w-4 h-4" style={{ color: content.accent }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{b.text}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* 下部CTA */}
      <div className="px-6 pb-10 pt-6">
        <div className="max-w-sm mx-auto">
          <Button
            onClick={onNext}
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg gap-2"
            style={{
              background: `linear-gradient(135deg, ${content.accent}, ${content.accent}dd)`,
              color: "white",
            }}
          >
            {content.cta}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== Step 6: お祝い画面 ====================

function CelebrateStep({
  friendlyName,
  onFinish,
}: {
  friendlyName: string;
  onFinish: () => void;
}) {
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
        <div className="absolute inset-0 rounded-full blur-3xl bg-gradient-to-br from-pink-400 via-purple-400 to-amber-400 opacity-60 scale-150" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-amber-400 flex items-center justify-center shadow-2xl">
          <Gift className="w-16 h-16 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center mb-3"
      >
        準備完了！
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-muted-foreground mb-6 max-w-xs"
      >
        {friendlyName}さんだけの推し活スペースが完成しました ✨
      </motion.p>

      {/* ようこそギフト */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="bg-gradient-to-br from-amber-50 to-pink-50 dark:from-amber-950/30 dark:to-pink-950/30 border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl px-5 py-4 mb-8 max-w-sm w-full"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">ようこそボーナス</p>
            <p className="text-xs text-muted-foreground">50ポイント獲得！</p>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">+50</div>
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
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 hover:opacity-95"
        >
          グッズを探しに行く
          <ArrowRight className="w-5 h-5" />
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          続きはホームのチェックリストから進められます
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
