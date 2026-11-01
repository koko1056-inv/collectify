import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { isWebCheckoutAvailable } from "@/utils/stripeCheckout";
import type { PlanRecoAudience } from "@/lib/planReco";

/**
 * プランのおすすめを見せてよい人か、の材料（src/lib/planReco.ts の isPlanRecoAudience に渡す）。
 * 契約中・サンプルアカウント・アプリ内（Web 以外）は、どのおすすめも出さない。
 */
export function usePlanRecoAudience(): PlanRecoAudience {
  const { user } = useAuth();
  const { isPremium, isLoading, isError } = useSubscription();
  const { profile } = useProfile(user?.id);
  return {
    signedIn: !!user?.id,
    subscriptionKnown: !!user?.id && !isLoading && !isError,
    isSubscriber: isPremium,
    isSample: profile ? !!profile.is_sample : null,
    canPurchase: isWebCheckoutAvailable(),
  };
}
