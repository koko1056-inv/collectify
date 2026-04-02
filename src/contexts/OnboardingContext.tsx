import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface OnboardingState {
  hasCompletedWalkthrough: boolean;
  hasCompletedWelcome: boolean;
  shownTooltips: {
    search: boolean;
    collection: boolean;
    wishlist: boolean;
    post: boolean;
  };
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  completeWalkthrough: () => void;
  markTooltipShown: (tooltipId: keyof OnboardingState['shownTooltips']) => void;
  shouldShowTooltip: (tooltipId: keyof OnboardingState['shownTooltips']) => boolean;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'collectify_onboarding_state';

const defaultState: OnboardingState = {
  hasCompletedWalkthrough: false,
  shownTooltips: {
    search: false,
    collection: false,
    wishlist: false,
    post: false,
  },
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(defaultState);

  // ユーザーIDに基づいてストレージキーを生成
  const getStorageKey = () => {
    return user?.id ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;
  };

  // ユーザーが変わったときにオンボーディング状態をロード
  useEffect(() => {
    if (user) {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setOnboardingState(JSON.parse(stored));
        } catch {
          setOnboardingState(defaultState);
        }
      } else {
        setOnboardingState(defaultState);
      }
    }
  }, [user?.id]);

  // オンボーディング状態が変わったときに保存
  useEffect(() => {
    if (user) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(onboardingState));
    }
  }, [onboardingState, user?.id]);

  const completeWalkthrough = () => {
    setOnboardingState(prev => ({
      ...prev,
      hasCompletedWalkthrough: true,
    }));
  };

  const markTooltipShown = (tooltipId: keyof OnboardingState['shownTooltips']) => {
    setOnboardingState(prev => ({
      ...prev,
      shownTooltips: {
        ...prev.shownTooltips,
        [tooltipId]: true,
      },
    }));
  };

  const shouldShowTooltip = (tooltipId: keyof OnboardingState['shownTooltips']) => {
    return onboardingState.hasCompletedWalkthrough && !onboardingState.shownTooltips[tooltipId];
  };

  const resetOnboarding = () => {
    setOnboardingState(defaultState);
    if (user) {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        completeWalkthrough,
        markTooltipShown,
        shouldShowTooltip,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
