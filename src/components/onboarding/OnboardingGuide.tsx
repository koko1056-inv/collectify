import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Package, Heart, X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

type GuideStep = 'register-goods' | 'register-wishlist' | 'done';

const GUIDE_STORAGE_KEY = 'collectify_onboarding_guide_step';

export function OnboardingGuide() {
  const [step, setStep] = useState<GuideStep>('done');
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const stored = sessionStorage.getItem(GUIDE_STORAGE_KEY);
    if (stored === 'register-goods' || stored === 'register-wishlist') {
      setStep(stored);
    }
  }, []);

  // Listen for step transitions from other pages
  useEffect(() => {
    const handleStorage = () => {
      const stored = sessionStorage.getItem(GUIDE_STORAGE_KEY);
      if (stored === 'register-wishlist') {
        setStep('register-wishlist');
        setDismissed(false);
      }
    };
    window.addEventListener('onboarding-guide-update', handleStorage);
    return () => window.removeEventListener('onboarding-guide-update', handleStorage);
  }, []);

  if (step === 'done' || dismissed) return null;

  const isGoodsStep = step === 'register-goods';
  const isOnSearchPage = location.pathname === '/search';

  const handleAction = () => {
    if (isGoodsStep) {
      if (!isOnSearchPage) {
        navigate('/search');
      }
      // User is on search page, they can browse and add items
    } else {
      // Wishlist step - navigate to search to find items to wishlist
      if (!isOnSearchPage) {
        navigate('/search');
      }
    }
  };

  const handleSkip = () => {
    if (isGoodsStep) {
      // Move to wishlist step
      sessionStorage.setItem(GUIDE_STORAGE_KEY, 'register-wishlist');
      setStep('register-wishlist');
    } else {
      // Done
      sessionStorage.removeItem(GUIDE_STORAGE_KEY);
      setStep('done');
    }
  };

  const handleDismiss = () => {
    sessionStorage.removeItem(GUIDE_STORAGE_KEY);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="sticky top-14 sm:top-20 z-30 px-2 sm:px-4 py-2"
      >
        <div className="max-w-lg mx-auto relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 shadow-lg backdrop-blur-sm">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="p-4 flex items-start gap-3">
            <div className="shrink-0 p-2 rounded-xl bg-primary/10">
              {isGoodsStep ? (
                <Package className="w-6 h-6 text-primary" />
              ) : (
                <Heart className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  ステップ {isGoodsStep ? '1' : '2'}/2
                </span>
              </div>

              <h3 className="font-bold text-sm text-foreground mb-0.5">
                {isGoodsStep
                  ? '持っているグッズを登録してみよう！'
                  : '欲しいグッズをウィッシュリストに追加！'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {isGoodsStep
                  ? 'グッズを見つけて「持ってる」ボタンを押すだけ！コレクションに追加されます。'
                  : '気になるグッズの「欲しい」ボタンを押して、ウィッシュリストに追加しましょう。'}
              </p>

              <div className="flex items-center gap-2">
                {!isOnSearchPage && (
                  <Button size="sm" onClick={handleAction} className="gap-1 h-8 text-xs rounded-full">
                    グッズを探す
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 text-xs text-muted-foreground"
                >
                  {isGoodsStep ? '次のステップへ' : '閉じる'}
                </Button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted/30 flex">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: isGoodsStep ? '50%' : '100%' }} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper to start the onboarding guide flow
export function startOnboardingGuide() {
  sessionStorage.setItem(GUIDE_STORAGE_KEY, 'register-goods');
  window.dispatchEvent(new Event('onboarding-guide-update'));
}

// Helper to advance to wishlist step
export function advanceToWishlistStep() {
  sessionStorage.setItem(GUIDE_STORAGE_KEY, 'register-wishlist');
  window.dispatchEvent(new Event('onboarding-guide-update'));
}

// Helper to complete the guide
export function completeOnboardingGuide() {
  sessionStorage.removeItem(GUIDE_STORAGE_KEY);
  window.dispatchEvent(new Event('onboarding-guide-update'));
}
