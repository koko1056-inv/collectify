import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { BookOpen, Check, Flame, Heart, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pocke, PockeBubble } from "@/components/pocke/Pocke";
import { StarterGoodsStep } from "@/components/onboarding/StarterGoodsStep";
import { readGuestPouch } from "@/utils/guestPouch";
import { getOptimizedImageUrl } from "@/utils/optimized-image";

type Step = "intro" | "pick" | "result";

/**
 * ログインなしのおためし（Duolingo の「アカウントを作る前に1レッスン」）。
 * ポッケのあいさつ → 推しの作品のグッズをタップして袋に入れる → 袋の中身を見せて「登録して保存」。
 * 入れたものは端末に置いておき、登録したらそのままコレクションへ移す（GuestPouchImporter）
 */
export default function GuestTry() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(() => (readGuestPouch().owned.length > 0 ? "result" : "intro"));
  const [pouch, setPouch] = useState(readGuestPouch);

  useEffect(() => {
    if (step === "result") setPouch(readGuestPouch());
  }, [step]);

  if (!loading && user) return <Navigate to="/collection" replace />;

  const signUp = () => navigate("/login?redirect=%2Fcollection&from=try");

  return (
    // 選ぶ画面は、一覧だけをスクロールさせて下の「進む」ボタンを常に見せる（画面の高さに固定）
    <div className={step === "pick" ? "flex h-[100dvh] flex-col overflow-hidden bg-background" : "flex min-h-[100dvh] flex-col bg-background"}>
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <img src="/icon-192.png" alt="Collectify" className="h-9 w-9 rounded-xl" />
        <Link to="/login?redirect=%2Fcollection" className="rounded-full px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary/10">
          {t("pocke.guest.login")}
        </Link>
      </header>

      {step === "intro" && (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 pb-10 text-center">
          <PockeBubble tail="bottom" className="text-base font-bold leading-relaxed">
            {t("pocke.guest.intro")}
          </PockeBubble>
          <Pocke pose="wave" height={200} motion="pop-bob" alt={t("pocke.name")} />
          <p className="text-sm text-muted-foreground">{t("pocke.guest.introSub")}</p>
          <Button size="lg" className="h-12 w-full rounded-full text-base font-bold" onClick={() => setStep("pick")}>
            {t("pocke.guest.start")}
          </Button>
          <Link to="/login?redirect=%2Fcollection" className="text-sm text-muted-foreground underline underline-offset-4">
            {t("pocke.guest.haveAccount")}
          </Link>
        </main>
      )}

      {step === "pick" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <StarterGoodsStep guest onDone={(n) => (n > 0 ? setStep("result") : signUp())} />
        </div>
      )}

      {step === "result" && (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 pb-10 pt-4">
          <div className="flex items-end gap-2">
            <Pocke pose={pouch.owned.length > 0 ? "celebrate" : "think"} height={120} motion="pop" />
            <PockeBubble tail="left" className="mb-6 flex-1">
              <p className="text-lg font-black leading-snug">
                {pouch.owned.length > 0 ? t("pocke.guest.resultTitle", { n: pouch.owned.length }) : t("pocke.guest.resultEmpty")}
              </p>
              {pouch.wished.length > 0 && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3 fill-primary text-primary" aria-hidden />
                  {t("pocke.guest.wishedCount", { n: pouch.wished.length })}
                </p>
              )}
            </PockeBubble>
          </div>

          {/* 袋の中身（入れたもの） */}
          {pouch.owned.length > 0 && (
            <ul className="grid grid-cols-4 gap-2 rounded-3xl bg-primary/10 p-3">
              {pouch.owned.slice(0, 12).map((it) => (
                <li key={it.id} className="relative aspect-square overflow-hidden rounded-xl bg-card shadow-sm">
                  {it.image && (
                    <img src={getOptimizedImageUrl(it.image, { width: 160 })} alt={it.title} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm leading-relaxed text-muted-foreground">{t("pocke.guest.resultBody")}</p>
          <ul className="space-y-2 text-sm">
            {[
              { icon: BookOpen, key: "perks1" },
              { icon: ArrowLeftRight, key: "perks2" },
              { icon: Flame, key: "perks3" },
            ].map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {t(`pocke.guest.${key}`)}
              </li>
            ))}
          </ul>

          <div className="mt-auto space-y-2 pt-2">
            <Button size="lg" className="h-12 w-full rounded-full text-base font-bold" onClick={signUp}>
              {t("pocke.guest.save")}
            </Button>
            <Button variant="ghost" className="w-full rounded-full" onClick={() => setStep("pick")}>
              {t("pocke.guest.more")}
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}
