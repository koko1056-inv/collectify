import { ONBOARDING_STEPS } from "@/components/onboarding/steps";
import { useOnboardingRewardPoints } from "@/hooks/useOnboardingRewardPoints";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeftRight, ArrowRight, Check, ChevronRight, Compass, Layers, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { toast } from "sonner";
import { Pocke, PockeBubble, PockeSays } from "@/components/pocke/Pocke";
import type { PockePose } from "@/components/pocke/pockeAssets";

/**
 * 使い方。案内するのはポッケ。
 *
 * 以前は「グッズを発見・コレクション管理・AIで推し部屋を生成」の3本立てと、古い画面の写真、
 * AIアバターやマイルームの紹介が並んでいて、いまのアプリ（登録 → 眺める → コンプ → 推しの部屋 → 交換 → みんな）と
 * 食い違っていた。いまの流れの順に、ポッケが1つずつ話す形にする。
 * 文言は translations の screens.howToUse（ポイントの数はサーバーの表 point_rewards / login_bonus_tiers に合わせてある）。
 */

/** 楽しみ方の流れ。並びがそのまま、はじめての人にすすめる順番 */
const FLOW: { id: string; pose: PockePose; path: string }[] = [
  { id: "add", pose: "pouch", path: "/quick-add" },
  { id: "view", pose: "love", path: "/collection" },
  { id: "complete", pose: "cheer", path: "/collection" },
  { id: "room", pose: "wink", path: "/oshi" },
  { id: "trade", pose: "point", path: "/trade" },
  { id: "explore", pose: "wave", path: "/explore" },
];

/** 下のタブ（左から） */
const TABS = [
  { id: "collection", icon: Layers, labelKey: "chrome.nav.collection", path: "/collection" },
  { id: "trade", icon: ArrowLeftRight, labelKey: "chrome.nav.trade", path: "/trade" },
  { id: "add", icon: Plus, labelKey: "chrome.nav.add", path: "/quick-add" },
  { id: "explore", icon: Compass, labelKey: "chrome.nav.explore", path: "/explore" },
  { id: "me", icon: User, labelKey: "chrome.nav.myPage", path: "/me" },
] as const;

const POINTS = ["register", "complete", "trade", "login"] as const;
const FAQS = ["notFound", "points", "trade", "room"] as const;

export default function HowToUse() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resetTours } = useOnboarding();
  // 額はサーバーの表から読む（表に行の無い手順には「+pt」を出さない）
  const { data: stepPoints } = useOnboardingRewardPoints();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-nav pt-4 sm:pb-10">
        <div className="mx-auto max-w-3xl space-y-12 px-4">
          {/* はじめに: ポッケのあいさつ */}
          <section className="flex flex-col items-center pt-4 text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{t("screens.howToUse.heroBadge")}</span>
            <PockeBubble className="mt-4 max-w-md px-5 py-3.5">
              <h1 className="text-xl font-bold leading-snug [text-wrap:balance] sm:text-2xl">{t("screens.howToUse.heroHello")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("screens.howToUse.heroLead")}</p>
            </PockeBubble>
            <Pocke pose="wave" height={180} motion="pop-bob" className="mt-3" alt={t("pocke.name")} />
          </section>

          {/* 楽しみ方の流れ。順番に意味があるので番号を付ける */}
          <section className="space-y-4" aria-labelledby="howto-flow">
            <div>
              <h2 id="howto-flow" className="text-xl font-bold">
                {t("screens.howToUse.flowHeading")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("screens.howToUse.flowSub")}</p>
            </div>
            <ol className="space-y-4">
              {FLOW.map((step, i) => (
                <li key={step.id} className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold tabular-nums text-primary-foreground">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-bold">{t(`screens.howToUse.flow.${step.id}.title`)}</h3>
                  </div>
                  <PockeSays pose={step.pose} height={84} className="mt-3">
                    <p className="text-sm font-bold">{t(`screens.howToUse.flow.${step.id}.says`)}</p>
                  </PockeSays>
                  <ul className="mt-3 space-y-1.5">
                    {[1, 2, 3].map((n) => (
                      <li key={n} className="flex gap-2 text-sm leading-relaxed">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>{t(`screens.howToUse.flow.${step.id}.point${n}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" className="mt-4 gap-1 rounded-full" onClick={() => navigate(step.path)}>
                    {t(`screens.howToUse.flow.${step.id}.cta`)}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ol>
          </section>

          {/* 下のタブの5つの画面 */}
          <section className="space-y-3" aria-labelledby="howto-tabs">
            <h2 id="howto-tabs" className="text-xl font-bold">
              {t("screens.howToUse.tabsHeading")}
            </h2>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {TABS.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => navigate(tab.path)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <IconTile tone={tab.id === "add" ? "primary" : "muted"} size="sm">
                      <tab.icon />
                    </IconTile>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{t(tab.labelKey)}</span>
                      <span className="block text-xs text-muted-foreground">{t(`screens.howToUse.tabs.${tab.id}`)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* ポッケのこと（どこにいて、何をしてくれるか） */}
          <section className="space-y-3" aria-labelledby="howto-pocke">
            <h2 id="howto-pocke" className="text-xl font-bold">
              {t("screens.howToUse.pockeHeading")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["corner", "peek"],
                  ["cheer", "celebrate"],
                  ["guide", "point"],
                ] as const
              ).map(([id, pose]) => (
                <div key={id} className="flex items-start gap-3 rounded-2xl border bg-card p-3 sm:flex-col sm:items-center sm:text-center">
                  <Pocke pose={pose} height={64} className="shrink-0" />
                  <p className="text-sm leading-relaxed">{t(`screens.howToUse.pocke.${id}`)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* はじめのステップ（はじめてガイドと同じもの。報酬の額はサーバーの表） */}
          <section className="space-y-3" aria-labelledby="howto-steps">
            <div>
              <h2 id="howto-steps" className="text-xl font-bold">
                {t("screens.howToUse.onboardingHeading", { n: ONBOARDING_STEPS.length })}
              </h2>
              <p className="text-sm text-muted-foreground">{t("screens.howToUse.onboardingSub")}</p>
            </div>
            <ol className="space-y-2">
              {ONBOARDING_STEPS.map((step, i) => (
                <li key={step.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <span className="w-4 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{i + 1}</span>
                  <IconTile tone="primary" size="sm">
                    <step.icon />
                  </IconTile>
                  <span className="flex-1 text-sm font-medium">{t(step.labelKey)}</span>
                  {stepPoints?.[step.id] ? (
                    <span className="rounded-full bg-points-soft px-2 py-0.5 text-xs font-bold tabular-nums text-points">+{stepPoints[step.id]}pt</span>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">{t("screens.howToUse.onboardingNote")}</p>
          </section>

          {/* ポイント */}
          <section className="space-y-3" aria-labelledby="howto-points">
            <div>
              <h2 id="howto-points" className="text-xl font-bold">
                {t("screens.howToUse.pointsHeading")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("screens.howToUse.pointsSub")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POINTS.map((id) => (
                <div key={id} className="rounded-2xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{t(`screens.howToUse.points.${id}`)}</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-points">{t(`screens.howToUse.points.${id}Value`)}</p>
                </div>
              ))}
            </div>
            <Button variant="link" className="h-auto gap-1 px-0" onClick={() => navigate("/point-shop/earn")}>
              {t("screens.howToUse.pointsMore")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </section>

          {/* よくある質問。答えるのもポッケ（口調をそろえる） */}
          <section className="space-y-3" aria-labelledby="howto-faq">
            <h2 id="howto-faq" className="text-xl font-bold">
              {t("screens.howToUse.faqHeading")}
            </h2>
            <div className="space-y-2">
              {FAQS.map((id) => (
                <details key={id} className="group rounded-2xl border bg-card px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
                    <span className="flex-1">{t(`screens.howToUse.faq.${id}.q`)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`screens.howToUse.faq.${id}.a`)}</p>
                </details>
              ))}
            </div>
          </section>

          {/* さいごに */}
          <section className="flex flex-col items-center gap-3 pb-6 text-center">
            <Pocke pose="celebrate" height={140} loading="lazy" />
            <h2 className="text-2xl font-bold">{t("screens.howToUse.ctaHeading")}</h2>
            <p className="text-sm text-muted-foreground">{t("screens.howToUse.ctaSub")}</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button size="lg" className="gap-1.5 rounded-full" onClick={() => navigate("/quick-add")}>
                <Plus className="h-5 w-5" />
                {t("screens.howToUse.ctaAdd")}
              </Button>
              <Button size="lg" variant="outline" className="rounded-full" onClick={() => navigate("/oshi")}>
                {t("screens.howToUse.ctaRoom")}
              </Button>
            </div>

            {/* 画面ガイドのやり直し。一度スキップすると二度と出せない、という行き止まりを作らないために置いている */}
            {user && (
              <button
                type="button"
                onClick={() => {
                  resetTours();
                  toast.success(t("tour.replayDone"));
                }}
                className="mt-2 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {t("tour.replayAll")}
              </button>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
