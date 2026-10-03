import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ALL_TOUR_IDS } from '@/components/onboarding/tours';

interface OnboardingState {
  hasCompletedWalkthrough: boolean;
  hasCompletedWelcome: boolean;
  /**
   * 見終わった画面ガイドのID（src/components/onboarding/tours.ts）。
   * ツールチップと違い端末間で同期させたいので profiles にも保存する。
   */
  completedTours: string[];
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  isInitialized: boolean;
  completeWalkthrough: () => void;
  completeWelcome: () => Promise<void>;
  /** その画面ガイドをまだ出していないか。ウェルカム完了後にのみ true。 */
  shouldShowTour: (tourId: string) => boolean;
  markTourDone: (tourId: string) => void;
  /** 「ガイドをすべて表示しない」。全IDを完了扱いにする。 */
  disableAllTours: () => void;
  /** ガイドだけをやり直す（ウェルカムは再表示しない）。 */
  resetTours: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'collectify_onboarding_state';

const defaultState: OnboardingState = {
  hasCompletedWalkthrough: false,
  hasCompletedWelcome: false,
  completedTours: [],
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
          .select('onboarded_at, completed_tours')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        const dbCompleted = !error && !!data?.onboarded_at;
        // ガイドは「どちらかで見た」を見た扱いにする。取りこぼして
        // 二度出すより、片方で見ていれば出さない方が邪魔にならない。
        const dbTours = (!error && data?.completed_tours) || [];
        const merged: OnboardingState = {
          ...localState,
          // DBに完了記録があれば確実に完了扱い（ローカル未完了でも上書き）
          hasCompletedWelcome: dbCompleted || localState.hasCompletedWelcome,
          hasCompletedWalkthrough: dbCompleted || localState.hasCompletedWalkthrough,
          completedTours: Array.from(new Set([...localState.completedTours, ...dbTours])),
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

  /**
   * 完了済みガイドをDBへ書き戻す。
   * 配列ごと置き換えるので、呼ぶ側が合算済みの配列を渡すこと。
   */
  const persistTours = useCallback(
    (tours: string[]) => {
      if (!user?.id) return;
      supabase
        .from('profiles')
        .update({ completed_tours: tours })
        .eq('id', user.id)
        .then(
          () => {},
          (e) => console.error('Failed to persist completed_tours:', e)
        );
    },
    [user?.id]
  );

  const shouldShowTour = useCallback(
    (tourId: string) => {
      // ウェルカムが終わる前に画面ガイドを重ねると二重の案内になる。
      if (!isInitialized || !onboardingState.hasCompletedWelcome) return false;
      return !onboardingState.completedTours.includes(tourId);
    },
    [isInitialized, onboardingState.hasCompletedWelcome, onboardingState.completedTours]
  );

  const markTourDone = useCallback(
    (tourId: string) => {
      setOnboardingState((prev) => {
        if (prev.completedTours.includes(tourId)) return prev;
        const completedTours = [...prev.completedTours, tourId];
        persistTours(completedTours);
        return { ...prev, completedTours };
      });
    },
    [persistTours]
  );

  const disableAllTours = useCallback(() => {
    setOnboardingState((prev) => {
      const completedTours = Array.from(new Set([...prev.completedTours, ...ALL_TOUR_IDS]));
      persistTours(completedTours);
      return { ...prev, completedTours };
    });
  }, [persistTours]);

  const resetTours = useCallback(() => {
    setOnboardingState((prev) => ({ ...prev, completedTours: [] }));
    persistTours([]);
  }, [persistTours]);

  const resetOnboarding = useCallback(() => {
    setOnboardingState(defaultState);
    if (user?.id) {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      // DBからもクリア（開発用）
      supabase
        .from('profiles')
        .update({ onboarded_at: null, completed_tours: [] })
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
        shouldShowTour,
        markTourDone,
        disableAllTours,
        resetTours,
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
