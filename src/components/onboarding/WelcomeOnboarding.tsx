import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { InitialInterestSelection } from '@/components/InitialInterestSelection';
import { useNavigate } from 'react-router-dom';
import { startOnboardingGuide } from './OnboardingGuide';

import onboardingCollectImg from '@/assets/onboarding-collect.png';
import onboardingCommunityImg from '@/assets/onboarding-community.png';
import onboardingRoomImg from '@/assets/onboarding-room.png';
import onboardingStartImg from '@/assets/onboarding-start.png';

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 'collect',
    image: onboardingCollectImg,
    title: '推しグッズを\nまるごと記録',
    description: '持っているグッズを登録して、コレクションを一覧管理。購入日や思い出も一緒に保存できます。',
    gradient: 'from-pink-500/20 via-purple-500/10 to-transparent',
    dotColor: 'bg-pink-500',
  },
  {
    id: 'community',
    image: onboardingCommunityImg,
    title: '仲間と繋がり\nグッズを共有',
    description: '投稿やトレード機能で同じ趣味のコレクターと交流。いいねやコメントで盛り上がろう！',
    gradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'room',
    image: onboardingRoomImg,
    title: 'マイルームで\n自分だけの空間を',
    description: 'バーチャルルームにグッズを飾って、自分だけの特別な空間を作りましょう。',
    gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
    dotColor: 'bg-orange-500',
  },
  {
    id: 'start',
    image: onboardingStartImg,
    title: 'さっそく\nはじめよう！',
    description: 'まずは好きなコンテンツを選んで、あなたにぴったりのグッズを見つけましょう。',
    gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
    dotColor: 'bg-amber-500',
  },
];

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showInterests, setShowInterests] = useState(false);
  const [direction, setDirection] = useState(1);
  const { completeWalkthrough } = useOnboarding();
  const navigate = useNavigate();

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      setShowInterests(true);
    }
  }, [currentSlide]);

  const handleSkip = useCallback(() => {
    setShowInterests(true);
  }, []);

  const handleInterestComplete = useCallback(() => {
    completeWalkthrough();
    onComplete();
    // Start the guided flow and navigate to search
    startOnboardingGuide();
    navigate('/search');
  }, [completeWalkthrough, onComplete, navigate]);

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 50) goNext();
    if (diff < -50 && currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
    setTouchStart(null);
  };

  const slide = slides[currentSlide];

  // 興味選択画面
  if (showInterests) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="max-w-lg mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">興味のあるコンテンツ</h2>
              <p className="text-muted-foreground text-sm">あなたにぴったりのグッズをおすすめします</p>
            </motion.div>
            <InitialInterestSelection
              onComplete={handleInterestComplete}
              standalone
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
          スキップ
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col items-center text-center w-full max-w-sm"
          >
            {/* Image */}
            <div className={`relative w-64 h-48 sm:w-80 sm:h-60 mb-8`}>
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${slide.gradient} blur-2xl`} />
              <img
                src={slide.image}
                alt={slide.title}
                className="relative w-full h-full object-contain drop-shadow-lg"
                width={800}
                height={600}
              />
            </div>

            {/* Text */}
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground whitespace-pre-line leading-tight mb-4">
              {slide.title}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="px-6 pb-10 pt-4 space-y-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setDirection(i > currentSlide ? 1 : -1);
                setCurrentSlide(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? `w-8 ${slide.dotColor}`
                  : i < currentSlide
                  ? `w-2 ${slide.dotColor}/50`
                  : 'w-2 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={goNext}
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg gap-2"
        >
          {currentSlide === slides.length - 1 ? (
            <>
              はじめる
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
    </div>
  );
}
