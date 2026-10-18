import { useState } from "react";
import { Check, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateMissionImage } from "@/hooks/useDailyMission";
import { useUploadOshiPhoto } from "@/hooks/useOshi";
import { Pocke } from "@/components/pocke/Pocke";
import { pockeCheer } from "@/components/pocke/pockeCheer";

type Phase = "idle" | "making" | "made" | "saved" | "failed" | "hidden";

/**
 * ウェルカムのお祝いで、AI を1回ためす（ポッケからのプレゼント・1人1回だけ無料）。
 * いま登録したグッズを、サーバーが選んでショーケースに飾った1枚にする。気に入ったら推しフォトに保存。
 * 「AIで何ができるか」を最初に見せるため。すぐ始めたい人の邪魔にならないよう、押さなければ何も起きない
 */
export function OnboardingAiTry() {
  const { t } = useLanguage();
  const upload = useUploadOshiPhoto();
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<{ imageUrl: string; itemId: string } | null>(null);

  const make = async () => {
    setPhase("making");
    try {
      const res = await generateMissionImage({ mode: "onboarding" });
      setResult(res);
      setPhase("made");
      pockeCheer("added");
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      // もう使った・グッズが無いときは、出さない（ほかの道は推しの部屋にある）
      setPhase(code === "onboarding_ai_used" || code === "no_item" ? "hidden" : "failed");
    }
  };

  const save = async () => {
    if (!result) return;
    try {
      await upload.mutateAsync({ imageUrl: result.imageUrl, isAi: true, itemId: result.itemId });
      setPhase("saved");
    } catch {
      setPhase("failed");
    }
  };

  if (phase === "hidden") return null;

  return (
    <section className="mt-4 w-full overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-background to-points/5 p-4 text-left">
      {phase === "idle" || phase === "failed" ? (
        <div className="flex items-center gap-3">
          <Pocke pose="wink" height={64} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("pocke.onboardingAi.title")}</p>
            <p className="text-xs text-muted-foreground">
              {phase === "failed" ? t("pocke.onboardingAi.failed") : t("pocke.onboardingAi.desc")}
            </p>
          </div>
          <Button size="sm" className="shrink-0 gap-1 rounded-full" onClick={make}>
            <Wand2 className="h-4 w-4" aria-hidden />
            {phase === "failed" ? t("pocke.onboardingAi.retry") : t("pocke.onboardingAi.button")}
          </Button>
        </div>
      ) : phase === "making" ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center" aria-live="polite">
          <Pocke pose="think" height={88} motion="bob" />
          <p className="text-sm font-bold text-primary">{t("pocke.onboardingAi.making")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          {result && (
            <div className="relative w-full max-w-[13rem] overflow-hidden rounded-2xl shadow-md motion-safe:animate-pocke-pop">
              <img src={result.imageUrl} alt="" className="aspect-square w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-2xs font-bold">
                {t("pocke.mission.aiBadge")}
              </span>
            </div>
          )}
          {phase === "saved" ? (
            <p className="flex items-center gap-1 text-sm font-bold text-success" aria-live="polite">
              <Check className="h-4 w-4" aria-hidden />
              {t("pocke.onboardingAi.saved")}
            </p>
          ) : (
            <>
              <p className="text-sm font-bold">{t("pocke.onboardingAi.made")}</p>
              <div className="flex w-full max-w-xs gap-2">
                <Button variant="ghost" className="flex-1 rounded-full" onClick={() => setPhase("hidden")}>
                  {t("pocke.onboardingAi.skip")}
                </Button>
                <Button className="flex-1 gap-1 rounded-full" disabled={upload.isPending} onClick={save}>
                  {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("pocke.onboardingAi.save")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
