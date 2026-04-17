import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  Heart,
  Box,
  Users,
  Gift,
  Star,
} from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { startOnboardingGuide } from "./OnboardingGuide";
import { cn } from "@/lib/utils";

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

// --- オンボーディングフロー ---
// 1. Welcome / 名前入力（displayName 未設定ならここで）
// 2. 機能紹介スライド (3枚) — ユーザー名を呼びかけてパーソナライズ
// 3. 興味選択
// 4. 完成セレブレーション（紙吹雪 + 50pt 付与）

type Step = "welcome" | "slides" | "interests" | "celebrate";

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const { user } = useAuth();
  const { completeWalkthrough, completeWelcome } = useOnboarding();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("welcome");
  const [displayName, setDisplayName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);

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

  // 呼びかけ名: 「〇〇さん」形式で使う
  const friendlyName = useMemo(() => (displayName.trim() ? displayName.trim() : "あなた"), [displayName]);

  // --- 機能紹介スライド（ユーザー名でパーソナライズ） ---
  const slides = useMemo(
    () => [
      {
        id: "collect",
        icon: Heart,
        title: `推しグッズを\nまるごと記録`,
        description: `${friendlyName}さんの大切なコレクション。購入日や思い出も一緒に、ひとつずつ丁寧に保存できます。`,
        gradient: "from-pink-400 via-rose-400 to-pink-500",
        accent: "#ec4899",
      },
      {
        id: "room",
        icon: Box,
        title: `あなただけの\n推し活ルーム`,
        description: `棚や台座を自由に組み合わせて、${friendlyName}さん好みのディスプレイを。壁紙や飾り方も自由自在。`,
        gradient: "from-purple-400 via-fuchsia-400 to-pink-400",
        accent: "#a855f7",
      },
      {
        id: "community",
        icon: Users,
        title: `仲間と繋がって\n一緒に盛り上がる`,
        description: `同じ推しの仲間と交流、トレードも。${friendlyName}さんのコレクションに「いいね」が届くかも？`,
        gradient: "from-amber-400 via-orange-400 to-rose-400",
        accent: "#f59e0b",
      },
    ],
    [friendlyName]
  );

  // --- Step handlers ---
  const goToSlides = useCallback(async () => {
    // 入力された display_name を保存
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
    setStep("slides");
  }, [user?.id, displayName]);

  const nextSlide = useCallback(() => {
    if (slide < slides.length - 1) {
      setDirection(1);
      setSlide((s) => s + 1);
    } else {
      setStep("interests");
    }
  }, [slide, slides.length]);

  const prevSlide = useCallback(() => {
    if (slide > 0) {
      setDirection(-1);
      setSlide((s) => s - 1);
    }
  }, [slide]);

  const handleInterestDone = useCallback(() => {
    setStep("celebrate");
  }, []);

  const handleFinish = useCallback(async () => {
    // Welcome Gift: 50pt を付与 (RPCでuser_pointsと原子的に同期)
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
    startOnboardingGuide();
    navigate("/search");
  }, [user?.id, completeWalkthrough, completeWelcome, onComplete, navigate]);

  // Touch swipe for slides
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
    setTouchStart(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* 背景に漂う絵文字（全ステップ共通のBGM的装飾） */}
      <FloatingEmojis />

      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <WelcomeStep
            key="welcome"
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onNext={goToSlides}
            isLoading={isLoadingProfile}
          />
        )}
        {step === "slides" && (
          <SlidesStep
            key="slides"
            slides={slides}
            currentSlide={slide}
            direction={direction}
            friendlyName={friendlyName}
            onNext={nextSlide}
            onPrev={prevSlide}
            onGoTo={(i) => {
              setDirection(i > slide ? 1 : -1);
              setSlide(i);
            }}
            onSkip={() => setStep("interests")}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}
        {step === "interests" && (
          <InterestsStep key="interests" friendlyName={friendlyName} onDone={handleInterestDone} />
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
      className="h-full flex flex-col items-center justify-center px-6"
    >
      {/* グラデーションオーブ */}
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

// ==================== Step 2: 機能紹介スライド ====================

function SlidesStep({
  slides,
  currentSlide,
  direction,
  friendlyName,
  onNext,
  onPrev,
  onGoTo,
  onSkip,
  onTouchStart,
  onTouchEnd,
}: {
  slides: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    description: string;
    gradient: string;
    accent: string;
  }>;
  currentSlide: number;
  direction: number;
  friendlyName: string;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
  onSkip: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  const s = slides[currentSlide];
  const Icon = s.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* スキップ */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          スキップ
        </Button>
      </div>

      {/* 挨拶バッジ */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border/40 text-xs font-medium">
        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
        <span className="text-foreground">{friendlyName}さん</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={s.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -80, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center text-center w-full max-w-sm"
          >
            {/* アニメーションするアイコン */}
            <div className="relative mb-10">
              {/* グラデーションブロブ（拡大縮小アニメ） */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, 6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full blur-3xl bg-gradient-to-br ${s.gradient} opacity-60 scale-[1.8]`}
              />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={`relative w-32 h-32 rounded-[40%] bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-2xl`}
              >
                <Icon className="w-16 h-16 text-white" strokeWidth={2.5} />
              </motion.div>

              {/* 周囲のキラキラ */}
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
                  <Sparkles className="w-5 h-5" style={{ color: s.accent }} />
                </motion.div>
              ))}
            </div>

            {/* タイトル */}
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground whitespace-pre-line leading-tight mb-4">
              {s.title}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
              {s.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 下部ナビ */}
      <div className="px-6 pb-10 pt-4 space-y-6">
        <div className="flex items-center justify-center gap-2">
          {slides.map((sl, i) => (
            <button
              key={sl.id}
              onClick={() => onGoTo(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === currentSlide ? "w-8" : "w-2",
                i <= currentSlide ? "bg-foreground" : "bg-muted-foreground/25"
              )}
              style={i === currentSlide ? { background: sl.accent } : undefined}
            />
          ))}
        </div>

        <Button
          onClick={onNext}
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg gap-2"
          style={{
            background: `linear-gradient(135deg, ${s.accent}, ${slides[(currentSlide + 1) % slides.length].accent})`,
            color: "white",
          }}
        >
          {isLast ? (
            <>
              次へ進む
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              次へ
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ==================== Step 3: 興味選択 ====================

function InterestsStep({
  friendlyName,
  onDone,
}: {
  friendlyName: string;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col"
    >
      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
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

// ==================== Step 4: お祝い画面 ====================

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
      className="h-full flex flex-col items-center justify-center px-6 relative overflow-hidden"
    >
      {/* Confetti */}
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
          推し活をはじめる
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ==================== 装飾: 漂う絵文字 ====================

const EMOJIS = ["✨", "💖", "🌸", "⭐", "🎀", "💫", "🫧", "🌟"];

function FloatingEmojis() {
  // クライアントで一度だけ位置をランダム化
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
