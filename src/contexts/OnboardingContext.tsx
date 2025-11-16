import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OnboardingState {
  hasCompletedWalkthrough: boolean;
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

const STORAGE_KEY = 'collectify_onboarding_state';

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
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(onboardingState));
  }, [onboardingState]);

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
    localStorage.removeItem(STORAGE_KEY);
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
