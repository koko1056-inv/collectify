import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCollectionCount } from "@/hooks/useCollectionLimit";
import { StarterGoodsStep } from "@/components/onboarding/StarterGoodsStep";
import { readGuestPouch } from "@/utils/guestPouch";
import { invalidateCollectionChanged } from "@/utils/collection-cache";

const DISMISS_KEY_PREFIX = "collectify.collectionStarter.dismissedOn";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * コレクションが0件（ロード完了後。ほしいものだけの人も0件扱い）のとき、
 * 空の表示の代わりに全画面で「持っているグッズをタップ」を出す（はじめての1コレと同じ画面）。
 *
 * - ウェルカム（WelcomeOnboarding）が出ている間は重ねて出さない
 * - ゲストの袋（GuestPouchImporter）を取り込み中は待つ（取り込み後に0件でなければ出さない）
 * - 「あとで」でその日は通常の空表示に戻す（localStorage、ユーザーごと・日付ごと）
 * - 1件以上追加して「次へ」を押したら、通常のコレクション画面へ戻す
 */
export function CollectionStarterOverlay() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { onboardingState, isInitialized } = useOnboarding();
  const { data: itemCount, isSuccess: itemCountLoaded } = useCollectionCount();
  // GuestPouchImporter が取り込み中はまだ localStorage に残っているので、それを見て待つ
  const guestPouchPending = readGuestPouch().owned.length > 0;

  const dismissKey = user ? `${DISMISS_KEY_PREFIX}_${user.id}` : null;
  const [dismissedToday, setDismissedToday] = useState(() => {
    if (!dismissKey) return false;
    try {
      return localStorage.getItem(dismissKey) === todayKey();
    } catch {
      return false;
    }
  });
  // 一度出したら、途中でグッズを追加してもitemCountの更新で消えないように固定する
  const [active, setActive] = useState(false);

  const eligible =
    !!user &&
    isInitialized &&
    onboardingState.hasCompletedWelcome &&
    itemCountLoaded &&
    itemCount === 0 &&
    !guestPouchPending &&
    !dismissedToday;

  useEffect(() => {
    if (eligible && !active) setActive(true);
  }, [eligible, active]);

  const dismiss = useCallback(() => {
    if (dismissKey) {
      try {
        localStorage.setItem(dismissKey, todayKey());
      } catch {
        /* 保存できなくても、この画面では閉じる */
      }
    }
    setDismissedToday(true);
    setActive(false);
  }, [dismissKey]);

  if (!active || dismissedToday) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
        <p className="text-sm font-bold">{t("collectionScreen.starterOverlay.title")}</p>
        <button
          type="button"
          onClick={dismiss}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          {t("collectionScreen.starterOverlay.later")}
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <StarterGoodsStep
          onDone={async (n) => {
            if (n > 0) {
              setActive(false);
              await invalidateCollectionChanged(queryClient, { userId: user?.id });
            } else {
              dismiss();
            }
          }}
          onPhoto={() => {
            setActive(false);
            navigate("/quick-add");
          }}
        />
      </div>
    </div>
  );
}
