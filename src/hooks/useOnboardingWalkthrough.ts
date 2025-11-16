import { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';

export function useOnboardingWalkthrough() {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const { onboardingState } = useOnboarding();
  const { user } = useAuth();

  useEffect(() => {
    // 新規ユーザーでウォークスルー未完了の場合に表示
    if (user && !onboardingState.hasCompletedWalkthrough) {
      // 少し遅延させて表示（ログイン直後のスムーズな遷移のため）
      const timer = setTimeout(() => {
        setShowWalkthrough(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, onboardingState.hasCompletedWalkthrough]);

  return {
    showWalkthrough,
    setShowWalkthrough,
  };
}
