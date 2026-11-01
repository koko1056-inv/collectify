import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PockeSays } from "@/components/pocke/Pocke";
import { AboutYouFields } from "@/components/profile/AboutYouFields";
import type { ProfileExtras } from "@/lib/profileExtras";
import { OnboardingBottomBar, OnboardingPrimaryButton } from "./OnboardingParts";

/**
 * ウェルカムの「あなたのこと」。性別・年代・都道府県と、推し活のこと（推し活歴・予算・よく買うグッズ・交換）を1画面で。
 * すべて任意で、何も選ばずに「次へ」で進める（上の「スキップ」でも）。答えは本人だけが見られる。
 * 好きな作品（推し）は次の興味の選択で聞くので、ここでは聞かない。
 */
export function AboutYouStep({
  friendlyName,
  value,
  onChange,
  onNext,
}: {
  friendlyName: string;
  value: ProfileExtras;
  onChange: (next: ProfileExtras) => void;
  onNext: () => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 pb-6 pt-5">
          <PockeSays pose="think">
            <h2 className="text-lg font-bold leading-snug">{t("aboutYou.step.title", { name: friendlyName })}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("aboutYou.step.desc")}</p>
          </PockeSays>
          <AboutYouFields value={value} onChange={onChange} className="mt-4" />
        </div>
      </div>

      <OnboardingBottomBar>
        <OnboardingPrimaryButton onClick={onNext}>
          {t("aboutYou.step.next")}
          <ArrowRight />
        </OnboardingPrimaryButton>
        <p className="mt-2 text-center text-2xs text-muted-foreground">{t("aboutYou.step.skipNote")}</p>
      </OnboardingBottomBar>
    </>
  );
}
