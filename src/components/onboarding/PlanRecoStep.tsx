import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { PockeSays } from "@/components/pocke/Pocke";
import { PlanPerkList } from "@/components/premium/PlanPerkList";
import { PLAN_NAMES, PLAN_PERKS, PLAN_PRICES_JPY } from "@/lib/planLimits";
import type { RecoPlan } from "@/lib/planReco";
import { OnboardingBottomBar, OnboardingPrimaryButton } from "./OnboardingParts";

/**
 * ウェルカムの最後の「プランもあるよ」。ハードなペイウォールにしない:
 *   - 「無料のまま、はじめる」を主ボタンにし、「プランをくわしく見る」は同じ大きさの枠線ボタン
 *   - 上の「あとで」でも同じように終えられる
 *   - 「無料でも機能はぜんぶ使える」をはっきり言う（ほかの機能は無料プランと同じ。planLimits.ts）
 * プランの購入はここではしない。「プランをくわしく見る」はウェルカムを終えてから、既存の PaywallModal を開く。
 * 出すのは Web で、契約中でもサンプルアカウントでもない人だけ（WelcomeOnboarding が決める）。
 */
export function PlanRecoStep({
  suggested,
  onSeePlans,
  onStayFree,
}: {
  suggested: RecoPlan;
  onSeePlans: () => void;
  onStayFree: () => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 pb-6 pt-5">
          <PockeSays pose="point">
            <h2 className="text-lg font-bold leading-snug">{t("planReco.onboarding.title")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("planReco.onboarding.desc")}</p>
          </PockeSays>

          {/* 2つのプランの見比べ（押しても何も起きない表示だけ。選ぶのはプランの画面で） */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["premium", "premium_plus"] as const).map((p) => {
              const isSuggested = p === suggested;
              return (
                <div
                  key={p}
                  className={cn(
                    "relative rounded-2xl border bg-card p-3 text-left shadow-sm",
                    isSuggested && "border-primary/60"
                  )}
                >
                  {isSuggested && (
                    <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-3xs font-bold text-primary-foreground">
                      {t("planReco.onboarding.suggested")}
                    </span>
                  )}
                  <p className="flex items-center gap-1 text-sm font-bold">
                    {p === "premium_plus" && <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                    {PLAN_NAMES[p]}
                  </p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">
                    {t("planReco.onboarding.perMonth", { price: PLAN_PRICES_JPY[p].monthly.toLocaleString() })}
                  </p>
                  <p className="mt-1 text-xs font-medium text-points">
                    {t("planReco.onboarding.monthlyPoints", { n: PLAN_PERKS[p].monthlyPoints.toLocaleString() })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("planReco.onboarding.aiDiscount", { n: PLAN_PERKS[p].aiDiscountPercent })}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
            <PlanPerkList />
            <p className="mt-3 text-2xs text-muted-foreground">{t("planReco.perks.keepNote")}</p>
          </div>
        </div>
      </div>

      <OnboardingBottomBar>
        <div className="space-y-2">
          <Button variant="outline" size="lg" className="h-12 w-full text-base font-bold" onClick={onSeePlans}>
            {t("planReco.onboarding.seePlans")}
          </Button>
          <OnboardingPrimaryButton onClick={onStayFree}>{t("planReco.onboarding.stayFree")}</OnboardingPrimaryButton>
        </div>
        <p className="mt-2 text-center text-2xs text-muted-foreground">{t("planReco.onboarding.note")}</p>
      </OnboardingBottomBar>
    </>
  );
}
