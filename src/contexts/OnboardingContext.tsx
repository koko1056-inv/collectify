import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  isInitialized: boolean;
  completeWalkthrough: () => void;
  completeWelcome: () => Promise<void>;
  markTooltipShown: (tooltipId: keyof OnboardingState['shownTooltips']) => void;
  shouldShowTooltip: (tooltipId: keyof OnboardingState['shownTooltips']) => boolean;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'collectify_onboarding_state';

const defaultState: OnboardingState = {
  hasCompletedWalkthrough: false,
  hasCompletedWelcome: false,
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
  const [isInitialized, setIsInitialized] = useState(false);

  const getStorageKey = useCallback(() => {
    return user?.id ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;
  }, [user?.id]);

  // ユーザー変更時: ローカル + DB 両方からオンボーディング状態を復元
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setIsInitialized(false);
        return;
      }

      // 1. ローカル保存状態を即時反映（FOUC防止）
      const storageKey = getStorageKey();
      let localState: OnboardingState = defaultState;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          localState = { ...defaultState, ...JSON.parse(stored) };
        } catch {
          /* ignore */
        }
      }

      // 2. DBから真の状態を取得（デバイス間で同期）
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarded_at')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        const dbCompleted = !error && !!data?.onboarded_at;
        const merged: OnboardingState = {
          ...localState,
          // DBに完了記録があれば確実に完了扱い（ローカル未完了でも上書き）
          hasCompletedWelcome: dbCompleted || localState.hasCompletedWelcome,
          hasCompletedWalkthrough: dbCompleted || localState.hasCompletedWalkthrough,
        };
        setOnboardingState(merged);
        localStorage.setItem(storageKey, JSON.stringify(merged));
      } catch {
        if (!cancelled) setOnboardingState(localState);
      } finally {
        if (!cancelled) setIsInitialized(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, getStorageKey]);

  // 状態変更時にローカル保存
  useEffect(() => {
    if (user?.id && isInitialized) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(onboardingState));
    }
  }, [onboardingState, user?.id, isInitialized, getStorageKey]);

  const completeWalkthrough = useCallback(() => {
    setOnboardingState((prev) => ({ ...prev, hasCompletedWalkthrough: true }));
  }, []);

  const completeWelcome = useCallback(async () => {
    setOnboardingState((prev) => ({ ...prev, hasCompletedWelcome: true }));

    // DBに永続化 — これで端末が変わっても再表示されない
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarded_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (e) {
        console.error('Failed to persist onboarded_at:', e);
      }
    }
  }, [user?.id]);

  const markTooltipShown = useCallback((tooltipId: keyof OnboardingState['shownTooltips']) => {
    setOnboardingState((prev) => ({
      ...prev,
      shownTooltips: { ...prev.shownTooltips, [tooltipId]: true },
    }));
  }, []);

  const shouldShowTooltip = useCallback(
    (tooltipId: keyof OnboardingState['shownTooltips']) => {
      return onboardingState.hasCompletedWalkthrough && !onboardingState.shownTooltips[tooltipId];
    },
    [onboardingState]
  );

  const resetOnboarding = useCallback(() => {
    setOnboardingState(defaultState);
    if (user?.id) {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      // DBからもクリア（開発用）
      supabase
        .from('profiles')
        .update({ onboarded_at: null })
        .eq('id', user.id)
        .then(() => {}, () => {});
    }
  }, [user?.id, getStorageKey]);

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        isInitialized,
        completeWalkthrough,
        completeWelcome,
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
