import { ONBOARDING_STEPS } from "@/components/onboarding/steps";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  Heart,
  ArrowRightLeft,
  Home,
  Plus,
  Sparkles,
  CheckCircle2,
  Gift,
  Lightbulb,
  ArrowRight,
  Zap,
  Lock,
  Package,
  UserCircle2,
  Wand2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { toast } from "sonner";

// スクリーンショット画像
import guideSearchImg from "@/assets/guide-search.png";
import guideCollectionImg from "@/assets/guide-collection.png";

// title/subtitle/description/steps/action は翻訳キー。
// モジュールスコープでは useLanguage が使えないため、描画時に t() で解決する。
// 以前は機能ごとに blue→cyan / green→emerald / purple→pink の虹色グラデーションを
// バッジ・見出し・番号・ボタンに塗っていて、安っぽく見えた。色はテーマの primary 1色にそろえる。
const featureShowcase = [
  {
    id: "search",
    title: "screens.howToUse.feature.search.title",
    subtitle: "screens.howToUse.feature.search.subtitle",
    description: "screens.howToUse.feature.search.description",
    image: guideSearchImg,
    steps: [
      "screens.howToUse.feature.search.step1",
      "screens.howToUse.feature.search.step2",
      "screens.howToUse.feature.search.step3",
    ],
    action: "screens.howToUse.feature.search.action",
    path: "/search",
  },
  {
    id: "collection",
    title: "screens.howToUse.feature.collection.title",
    subtitle: "screens.howToUse.feature.collection.subtitle",
    description: "screens.howToUse.feature.collection.description",
    image: guideCollectionImg,
    steps: [
      "screens.howToUse.feature.collection.step1",
      "screens.howToUse.feature.collection.step2",
      "screens.howToUse.feature.collection.step3",
    ],
    action: "screens.howToUse.feature.collection.action",
    path: "/collection",
  },
  {
    id: "ai-room",
    title: "screens.howToUse.feature.aiRoom.title",
    subtitle: "screens.howToUse.feature.aiRoom.subtitle",
    description: "screens.howToUse.feature.aiRoom.description",
    image: guideCollectionImg,
    steps: [
      "screens.howToUse.feature.aiRoom.step1",
      "screens.howToUse.feature.aiRoom.step2",
      "screens.howToUse.feature.aiRoom.step3",
    ],
    action: "screens.howToUse.feature.aiRoom.action",
    path: "/ai-rooms",
  },
];

// title/description は翻訳キー（描画時に t() で解決）。
// 以前は1枚ずつ blue / pink / orange… の原色ベタ塗りの丸だった。IconTile の primary にそろえる。
const quickTips = [
  {
    icon: Plus,
    title: "screens.howToUse.tip.add.title",
    description: "screens.howToUse.tip.add.description",
  },
  {
    icon: Heart,
    title: "screens.howToUse.tip.wishlist.title",
    description: "screens.howToUse.tip.wishlist.description",
  },
  {
    icon: ArrowRightLeft,
    title: "screens.howToUse.tip.trade.title",
    description: "screens.howToUse.tip.trade.description",
  },
  {
    icon: Home,
    title: "screens.howToUse.tip.myRoom.title",
    description: "screens.howToUse.tip.myRoom.description",
  },
  {
    icon: UserCircle2,
    title: "screens.howToUse.tip.avatar.title",
    description: "screens.howToUse.tip.avatar.description",
  },
  {
    icon: Wand2,
    title: "screens.howToUse.tip.aiRoom.title",
    description: "screens.howToUse.tip.aiRoom.description",
  },
];


// q/a は翻訳キー（描画時に t() で解決）。
// 以前は 🔍💎🏠🔄 の絵文字だった。ほかのアイコンと線の太さをそろえるため lucide にする。
const faqs = [
  {
    q: "screens.howToUse.faq.notFound.q",
    a: "screens.howToUse.faq.notFound.a",
    icon: Search,
  },
  {
    q: "screens.howToUse.faq.points.q",
    a: "screens.howToUse.faq.points.a",
    icon: Gift,
  },
  {
    q: "screens.howToUse.faq.roomVisibility.q",
    a: "screens.howToUse.faq.roomVisibility.a",
    icon: Lock,
  },
  {
    q: "screens.howToUse.faq.trade.q",
    a: "screens.howToUse.faq.trade.a",
    icon: ArrowRightLeft,
  },
];

export default function HowToUse() {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resetTours } = useOnboarding();

  // ブランド名だけグラデーションを当てたいので、{app} の前後で分割して描画する。
  // 文全体を1キーで持つことで、日英で語順が変わっても崩れない。
  const [heroTitleBefore, heroTitleAfter = ""] = t(
    "screens.howToUse.heroTitle"
  ).split("{app}");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <main className={`${isMobile ? "pb-nav" : "pt-4 pb-8"}`}>
        <div className="max-w-6xl mx-auto px-4 space-y-16">
          {/* ヒーローセクション */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 py-8"
          >
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              <Lightbulb className="w-4 h-4 mr-2" />
              {t("screens.howToUse.heroBadge")}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              {heroTitleBefore}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Collectify
              </span>
              {heroTitleAfter}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("screens.howToUse.heroLead1")}
              <br className="hidden md:block" />
              {t("screens.howToUse.heroLead2")}
            </p>
          </motion.section>

          {/* はじめのステップ（オンボーディング報酬） */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                {t("screens.howToUse.onboardingHeading", { n: ONBOARDING_STEPS.length })}
              </h2>
              <p className="text-muted-foreground mt-2">
                {t("screens.howToUse.onboardingSub")}
              </p>
            </div>
            <Card className="border-2 border-primary/20 overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <ol className="grid sm:grid-cols-2 gap-3">
                  {ONBOARDING_STEPS.map((step, i) => (
                    <li
                      key={step.id}
                      className="flex items-center gap-3 rounded-xl bg-muted/40 p-3"
                    >
                      <span className="w-4 text-right text-xs font-medium tabular-nums text-muted-foreground shrink-0">
                        {i + 1}
                      </span>
                      <IconTile tone="primary" size="sm">
                        <step.icon />
                      </IconTile>
                      <span className="flex-1 text-sm font-medium">
                        {t(step.labelKey)}
                      </span>
                      <Badge variant="secondary" className="font-bold">
                        +{step.points}pt
                      </Badge>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  {t("screens.howToUse.onboardingNote")}
                </p>
              </CardContent>
            </Card>
          </motion.section>

          {/* メイン機能ショーケース */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold">{t("screens.howToUse.featuresHeading")}</h2>
              <p className="text-muted-foreground mt-2">
                {t("screens.howToUse.featuresSub")}
              </p>
            </div>

            <div className="space-y-12">
              {featureShowcase.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden border-0 shadow-xl">
                    <div
                      className={`grid ${
                        isMobile ? "grid-cols-1" : "md:grid-cols-2"
                      }`}
                    >
                      {/* 画像セクション */}
                      <div
                        className={`relative overflow-hidden ${
                          !isMobile && index % 2 === 1 ? "md:order-2" : ""
                        }`}
                      >
                        <img
                          src={feature.image}
                          alt={t(feature.title)}
                          className="w-full h-full object-cover object-top aspect-video md:aspect-auto"
                        />
                        <div
                          className={`absolute top-4 ${
                            index % 2 === 0 ? "left-4" : "right-4"
                          }`}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-background/90 text-foreground shadow-sm backdrop-blur-sm tabular-nums"
                          >
                            STEP {index + 1}
                          </Badge>
                        </div>
                      </div>

                      {/* コンテンツセクション */}
                      <div className="p-6 md:p-8 flex flex-col justify-center bg-card">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-primary">
                              {t(feature.subtitle)}
                            </p>
                            <h3 className="text-2xl md:text-3xl font-bold mt-1">
                              {t(feature.title)}
                            </h3>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            {t(feature.description)}
                          </p>

                          <div className="space-y-2 pt-2">
                            {feature.steps.map((step, stepIndex) => (
                              <div
                                key={stepIndex}
                                className="flex items-center gap-3"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 flex items-center justify-center text-xs font-semibold tabular-nums shrink-0">
                                  {stepIndex + 1}
                                </div>
                                <span className="text-sm">{t(step)}</span>
                              </div>
                            ))}
                          </div>

                          <Button
                            className="mt-4 self-start"
                            onClick={() => navigate(feature.path)}
                          >
                            {t(feature.action)}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* クイックヒント */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                {t("screens.howToUse.quickTipsHeading")}
              </h2>
              <p className="text-muted-foreground mt-2">
                {t("screens.howToUse.quickTipsSub")}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {quickTips.map((tip, index) => (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-4 md:p-6 text-center space-y-3">
                      <IconTile tone="primary" size="md">
                        <tip.icon />
                      </IconTile>
                      <div>
                        <h3 className="font-bold">{t(tip.title)}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          {t(tip.description)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ポイントセクション */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden border-2 border-primary/20">
              {/* 以前は primary のグラデーション面に白い Gift を載せていた。ポイントの話なので points の面にする */}
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <IconTile tone="points" size="lg">
                    <Gift />
                  </IconTile>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl md:text-2xl font-bold">
                      {t("screens.howToUse.pointsHeading")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
                        <IconTile tone="primary" size="sm">
                          <Package />
                        </IconTile>
                        <div>
                          <div className="font-medium">{t("screens.howToUse.pointsPost")}</div>
                          <div className="text-points font-bold tabular-nums">{t("screens.howToUse.pointsPostValue")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
                        <IconTile tone="primary" size="sm">
                          <CheckCircle2 />
                        </IconTile>
                        <div>
                          <div className="font-medium">{t("screens.howToUse.pointsDailyLogin")}</div>
                          <div className="text-points font-bold tabular-nums">{t("screens.howToUse.pointsDailyLoginValue")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
                        <IconTile tone="primary" size="sm">
                          <Sparkles />
                        </IconTile>
                        <div>
                          <div className="font-medium">{t("screens.howToUse.pointsStepsDone")}</div>
                          <div className="text-points font-bold tabular-nums">{t("screens.howToUse.pointsStepsValue", { n: ONBOARDING_STEPS.reduce((sum, s) => sum + s.points, 0) })}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.section>

          {/* よくある質問 */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold">{t("screens.howToUse.faqHeading")}</h2>
              <p className="text-muted-foreground mt-2">{t("screens.howToUse.faqSub")}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <IconTile tone="muted" size="md">
                          <faq.icon />
                        </IconTile>
                        <div className="space-y-2">
                          <h3 className="font-bold text-base">{t(faq.q)}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t(faq.a)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-12 space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              {t("screens.howToUse.ctaHeading")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("screens.howToUse.ctaSub")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="text-base px-8"
                onClick={() => navigate("/search")}
              >
                <Search className="w-5 h-5 mr-2" />
                {t("screens.howToUse.ctaFindGoods")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8"
                onClick={() => navigate("/me?tab=ai")}
              >
                <Home className="w-5 h-5 mr-2" />
                {t("screens.howToUse.ctaMyRoom")}
              </Button>
            </div>

            {/* 画面ガイドのやり直し。一度スキップすると二度と出せない、という
                行き止まりを作らないために置いている。 */}
            {user && (
              <button
                type="button"
                onClick={() => {
                  resetTours();
                  toast.success(t("tour.replayDone"));
                }}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              >
                {t("tour.replayAll")}
              </button>
            )}
          </motion.section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
