import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Heart,
  Users,
  Camera,
  Wand2,
  Search,
  ArrowRight,
  Star,
  Gift,
  MessageCircle,
  Repeat,
  Trophy,
  Layers,
  CheckCircle2,
  Apple,
  Play,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

import onboardingRoom from "@/assets/onboarding-room.png";
import onboardingCommunity from "@/assets/onboarding-community.png";
import guideCollection from "@/assets/guide-collection.png";
import guidePosts from "@/assets/guide-posts.png";
import guideSearch from "@/assets/guide-search.png";

/* ──────────────────────────────────────────────────────────────────
 *  Collectify Landing Page
 *  ─ 推し活 × デジタルコレクション × AI部屋 × マッチング
 *  ─ Pink-rose theme aligned with brand (--primary: 350 65% 55%)
 * ────────────────────────────────────────────────────────────────── */

export default function Landing() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Page-specific SEO meta tags + JSON-LD structured data
  useEffect(() => {
    const TITLE = t("screens.landing.seoTitle");
    const DESC = t("screens.landing.seoDescription");
    const URL =
      typeof window !== "undefined" ? window.location.origin + "/lp" : "https://collectify.app/lp";
    const OG_IMAGE =
      typeof window !== "undefined" ? window.location.origin + "/og-image.png" : "https://collectify.app/og-image.png";

    const prevTitle = document.title;
    document.title = TITLE;

    const setMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    const updates = [
      setMeta('meta[name="description"]', "name", "description", DESC),
      setMeta('meta[property="og:title"]', "property", "og:title", TITLE),
      setMeta('meta[property="og:description"]', "property", "og:description", DESC),
      setMeta('meta[property="og:url"]', "property", "og:url", URL),
      setMeta('meta[property="og:image"]', "property", "og:image", OG_IMAGE),
      setMeta('meta[property="og:type"]', "property", "og:type", "website"),
      setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image"),
      setMeta('meta[name="twitter:title"]', "name", "twitter:title", TITLE),
      setMeta('meta[name="twitter:description"]', "name", "twitter:description", DESC),
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", OG_IMAGE),
    ];

    // Canonical URL
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const prevCanonicalHref = canonical.href;
    canonical.href = URL;

    // JSON-LD structured data: SoftwareApplication
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Collectify",
      description: DESC,
      url: URL,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "iOS, Android, Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "100",
      },
      author: {
        "@type": "Organization",
        name: "MGC inc.",
        url: "https://mgc-global.com",
      },
    };
    const ldScript = document.createElement("script");
    ldScript.type = "application/ld+json";
    ldScript.id = "ld-collectify-software";
    ldScript.text = JSON.stringify(jsonLd);
    // Replace any existing identical script
    document.getElementById("ld-collectify-software")?.remove();
    document.head.appendChild(ldScript);

    return () => {
      document.title = prevTitle;
      canonical && (canonical.href = prevCanonicalHref);
      ldScript.remove();
      // Note: meta tags themselves are left in place; index.html defaults
      // are restored by browser when navigating to a route that re-sets them.
      void updates;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* ───────── Top Nav ───────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-xl bg-background/80 border-b border-border/60 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/lp" className="flex items-center gap-2">
            <div className="relative">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-pink-400 grid place-items-center shadow-lg shadow-primary/30">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary to-pink-400 opacity-30 blur-md -z-10" />
            </div>
            <span className="font-bold text-lg tracking-tight">Collectify</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">
              {t("screens.landing.navFeatures")}
            </a>
            <a href="#showcase" className="text-muted-foreground hover:text-foreground transition">
              {t("screens.landing.navHowTo")}
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">
              {t("screens.landing.navPricing")}
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition">
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="rounded-full">
                {t("screens.landing.navLogin")}
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-primary to-pink-400 hover:opacity-90 text-white shadow-lg shadow-primary/25"
              >
                {t("screens.landing.navStart")}
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={t("screens.landing.navMenu")}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileNavOpen(false)} className="py-2">{t("screens.landing.navFeatures")}</a>
              <a href="#showcase" onClick={() => setMobileNavOpen(false)} className="py-2">{t("screens.landing.navHowTo")}</a>
              <a href="#pricing" onClick={() => setMobileNavOpen(false)} className="py-2">{t("screens.landing.navPricing")}</a>
              <a href="#faq" onClick={() => setMobileNavOpen(false)} className="py-2">FAQ</a>
              <Link to="/login" className="pt-2">
                <Button className="w-full rounded-full bg-gradient-to-r from-primary to-pink-400 text-white">
                  {t("screens.landing.navStart")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden pt-32 sm:pt-40 pb-20 sm:pb-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-primary/30 to-pink-300/20 blur-3xl" />
          <div className="absolute top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-amber-200/30 to-rose-200/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="mb-6 border-primary/30 bg-primary/5 text-primary px-3 py-1 rounded-full"
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                {t("screens.landing.heroBadge")}
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1]">
                {t("screens.landing.heroTitle1")}
                <br />
                <span className="bg-gradient-to-r from-primary via-pink-500 to-rose-400 bg-clip-text text-transparent">
                  {t("screens.landing.heroTitleAccent")}
                </span>
                {t("screens.landing.heroTitleTail")}
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
                {t("screens.landing.heroLead1")}
                <br className="hidden sm:block" />
                {t("screens.landing.heroLead2")}
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-14 px-8 rounded-full text-base bg-gradient-to-r from-primary to-pink-400 hover:opacity-90 text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all"
                  >
                    {t("screens.landing.heroCtaFree")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-8 rounded-full text-base border-2"
                  >
                    {t("screens.landing.heroCtaFeatures")}
                  </Button>
                </a>
              </div>

              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t("screens.landing.noCreditCard")}
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t("screens.landing.freeToStart")}
                </div>
              </div>

              <div className="mt-10 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-10 w-10 rounded-full border-2 border-background bg-gradient-to-br ${
                        i === 1
                          ? "from-pink-300 to-rose-400"
                          : i === 2
                          ? "from-amber-300 to-orange-400"
                          : i === 3
                          ? "from-purple-300 to-pink-400"
                          : "from-blue-300 to-cyan-400"
                      } shadow-md`}
                    />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("screens.landing.socialProof")}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="relative mx-auto max-w-md">
                <div className="absolute -top-4 -left-8 w-32 h-40 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-200 rotate-[-8deg] shadow-xl border border-white" />
                <div className="absolute top-12 -right-6 w-28 h-36 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 rotate-[6deg] shadow-xl border border-white" />

                <div className="relative mx-auto w-[280px] sm:w-[320px] aspect-[9/19] rounded-[3rem] bg-gradient-to-br from-zinc-900 to-zinc-700 p-2.5 shadow-2xl shadow-primary/20">
                  <div className="absolute top-7 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-900 rounded-full z-10" />
                  <div className="h-full w-full rounded-[2.5rem] overflow-hidden bg-background relative">
                    <img
                      src={onboardingRoom}
                      alt={t("screens.landing.appScreenshotAlt")}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-background border border-border/60 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-100 grid place-items-center">
                    <Heart className="h-5 w-5 text-primary fill-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("screens.landing.statGoodsLabel")}</div>
                    <div className="font-bold text-sm">{t("screens.landing.statGoodsValue")}</div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 bg-background border border-border/60 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center">
                    <Trophy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("screens.landing.statRankLabel")}</div>
                    <div className="font-bold text-sm">{t("screens.landing.statRankValue")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Pain Points ───────── */}
      <section className="relative py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="outline" className="mb-4 rounded-full">
              {t("screens.landing.painBadge")}
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              {t("screens.landing.painTitle1")}
              <br />
              <span className="text-muted-foreground">{t("screens.landing.painTitle2")}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                emoji: "😱",
                title: t("screens.landing.pain1Title"),
                desc: t("screens.landing.pain1Desc"),
              },
              {
                emoji: "📦",
                title: t("screens.landing.pain2Title"),
                desc: t("screens.landing.pain2Desc"),
              },
              {
                emoji: "💔",
                title: t("screens.landing.pain3Title"),
                desc: t("screens.landing.pain3Desc"),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group relative bg-background rounded-3xl border border-border/60 p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-5xl mb-4">{item.emoji}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Solution / Main Features ───────── */}
      <section id="features" className="relative py-20 sm:py-32 bg-gradient-to-b from-background via-accent/30 to-background overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] bg-gradient-to-r from-pink-200/40 via-rose-200/40 to-amber-200/40 blur-3xl rounded-full" />
        </div>

        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <Badge className="mb-4 rounded-full bg-primary/10 text-primary border-0 hover:bg-primary/15">
              {t("screens.landing.solutionBadge")}
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              {t("screens.landing.solutionTitle1")}
              <span className="bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-transparent">
                {t("screens.landing.solutionTitle2")}
              </span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              {t("screens.landing.solutionLead")}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="group relative bg-background rounded-[2rem] border border-border/60 p-8 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-pink-400 grid place-items-center mb-6 shadow-lg shadow-primary/30">
                  <Layers className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {t("screens.landing.feat1Title1")}
                  <br />
                  {t("screens.landing.feat1Title2")}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {t("screens.landing.feat1Desc")}
                </p>
                <ul className="space-y-2 text-sm">
                  {[t("screens.landing.feat1Item1"), t("screens.landing.feat1Item2"), t("screens.landing.feat1Item3")].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-primary to-pink-400 text-white rounded-[2rem] p-8 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 overflow-hidden lg:scale-105 lg:-my-2">
              <div className="absolute -top-12 -right-12 h-40 w-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
              <Badge className="bg-white/20 text-white border-0 mb-4 backdrop-blur-sm">
                {t("screens.landing.feat2Badge")}
              </Badge>
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center mb-6 shadow-xl">
                  <Wand2 className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {t("screens.landing.feat2Title1")}
                  <br />
                  {t("screens.landing.feat2Title2")}
                </h3>
                <p className="text-white/90 leading-relaxed mb-6">
                  {t("screens.landing.feat2Desc")}
                </p>
                <ul className="space-y-2 text-sm">
                  {[t("screens.landing.feat2Item1"), t("screens.landing.feat2Item2"), t("screens.landing.feat2Item3")].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-white/95">
                      <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="group relative bg-background rounded-[2rem] border border-border/60 p-8 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-amber-300/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 grid place-items-center mb-6 shadow-lg shadow-amber-400/30">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {t("screens.landing.feat3Title1")}
                  <br />
                  {t("screens.landing.feat3Title2")}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {t("screens.landing.feat3Desc")}
                </p>
                <ul className="space-y-2 text-sm">
                  {[t("screens.landing.feat3Item1"), t("screens.landing.feat3Item2"), t("screens.landing.feat3Item3")].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Showcase: All Features ───────── */}
      <section id="showcase" className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="outline" className="mb-4 rounded-full">
              FEATURES
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              {t("screens.landing.showcaseTitle")}
            </h2>
          </div>

          <div className="space-y-20 sm:space-y-28">
            {[
              {
                badge: t("screens.landing.show1Badge"),
                title: t("screens.landing.show1Title"),
                desc: t("screens.landing.show1Desc"),
                features: [t("screens.landing.show1Item1"), t("screens.landing.show1Item2"), t("screens.landing.show1Item3")],
                img: guideCollection,
                reverse: false,
              },
              {
                badge: t("screens.landing.show2Badge"),
                title: t("screens.landing.show2Title"),
                desc: t("screens.landing.show2Desc"),
                features: [t("screens.landing.show2Item1"), t("screens.landing.show2Item2"), t("screens.landing.show2Item3")],
                img: onboardingCommunity,
                reverse: true,
              },
              {
                badge: t("screens.landing.show3Badge"),
                title: t("screens.landing.show3Title"),
                desc: t("screens.landing.show3Desc"),
                features: [t("screens.landing.show3Item1"), t("screens.landing.show3Item2"), t("screens.landing.show3Item3")],
                img: guidePosts,
                reverse: false,
              },
              {
                badge: t("screens.landing.show4Badge"),
                title: t("screens.landing.show4Title"),
                desc: t("screens.landing.show4Desc"),
                features: [t("screens.landing.show4Item1"), t("screens.landing.show4Item2"), t("screens.landing.show4Item3")],
                img: guideSearch,
                reverse: true,
              },
            ].map((block) => (
              <div
                key={block.title}
                className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                  block.reverse ? "lg:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <Badge className="mb-4 rounded-full bg-accent text-accent-foreground border-0">
                    {block.badge}
                  </Badge>
                  <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                    {block.title}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    {block.desc}
                  </p>
                  <ul className="space-y-2.5">
                    {block.features.map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 grid place-items-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-pink-300/20 to-amber-200/20 rounded-3xl blur-2xl" />
                  <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl shadow-primary/10">
                    <img src={block.img} alt={block.title} className="w-full h-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Mini Features Grid ───────── */}
      <section className="py-20 sm:py-24 bg-accent/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t("screens.landing.miniTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { icon: Camera, title: t("screens.landing.mini1Title"), desc: t("screens.landing.mini1Desc") },
              { icon: Repeat, title: t("screens.landing.mini2Title"), desc: t("screens.landing.mini2Desc") },
              { icon: MessageCircle, title: t("screens.landing.mini3Title"), desc: t("screens.landing.mini3Desc") },
              { icon: Search, title: t("screens.landing.mini4Title"), desc: t("screens.landing.mini4Desc") },
              { icon: Gift, title: t("screens.landing.mini5Title"), desc: t("screens.landing.mini5Desc") },
              { icon: Trophy, title: t("screens.landing.mini6Title"), desc: t("screens.landing.mini6Desc") },
              { icon: Star, title: t("screens.landing.mini7Title"), desc: t("screens.landing.mini7Desc") },
              { icon: Heart, title: t("screens.landing.mini8Title"), desc: t("screens.landing.mini8Desc") },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-background rounded-2xl p-5 border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-bold text-sm mb-1">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Compatible Content ───────── */}
      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              {t("screens.landing.genresTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("screens.landing.genresLead1")}
              <br className="hidden sm:block" />
              {t("screens.landing.genresLead2")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
            {[
              t("screens.landing.genreAnime"), t("screens.landing.genreGame"), t("screens.landing.genreIdol"), t("screens.landing.genreVoiceActor"), "Vtuber", "K-POP", "JPop",
              t("screens.landing.genreManga"), t("screens.landing.genreMovie"), t("screens.landing.genreDrama"), t("screens.landing.genreStage"), t("screens.landing.genreVoiceLive"), t("screens.landing.genreComic"),
              t("screens.landing.genreAcrylicStand"), t("screens.landing.genreCanBadge"), t("screens.landing.genrePlush"), t("screens.landing.genreFigure"), t("screens.landing.genrePoster"),
              t("screens.landing.genreRubberStrap"), t("screens.landing.genreClearFile"), t("screens.landing.genreLimited"), t("screens.landing.genreLiveGoods"),
            ].map((tag, i) => (
              <span
                key={tag}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all hover:scale-105 ${
                  i % 5 === 0
                    ? "bg-primary/10 text-primary border-primary/20"
                    : i % 5 === 1
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : i % 5 === 2
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : i % 5 === 3
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-background text-foreground border-border"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Pricing ───────── */}
      <section id="pricing" className="py-20 sm:py-28 bg-gradient-to-b from-background to-accent/40">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="outline" className="mb-4 rounded-full">
              {t("screens.landing.pricingBadge")}
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              {t("screens.landing.pricingTitle")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("screens.landing.pricingLead")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-background rounded-3xl border border-border/60 p-8 lg:p-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">FREE</div>
                  <div className="text-3xl font-bold">{t("screens.landing.planFreeName")}</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-secondary grid place-items-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="text-4xl font-bold mb-1">¥0</div>
              <div className="text-sm text-muted-foreground mb-8">{t("screens.landing.planFreeNote")}</div>
              <ul className="space-y-3 mb-8">
                {[
                  t("screens.landing.planFree1"),
                  t("screens.landing.planFree2"),
                  t("screens.landing.planFree3"),
                  t("screens.landing.planFree4"),
                  t("screens.landing.planFree5"),
                  t("screens.landing.planFree6"),
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login">
                <Button variant="outline" className="w-full h-12 rounded-full">
                  {t("screens.landing.heroCtaFree")}
                </Button>
              </Link>
            </div>

            <div className="relative bg-gradient-to-br from-primary to-pink-500 text-white rounded-3xl p-8 lg:p-10 shadow-2xl shadow-primary/30 overflow-hidden">
              <div className="absolute -top-20 -right-20 h-48 w-48 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm font-medium text-white/70 mb-1">POINTS</div>
                    <div className="text-3xl font-bold">{t("screens.landing.planPointsName")}</div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-4xl font-bold mb-1">¥120 〜</div>
                <div className="text-sm text-white/80 mb-8">{t("screens.landing.planPointsNote")}</div>
                <ul className="space-y-3 mb-8">
                  {[
                    t("screens.landing.planPoints1"),
                    t("screens.landing.planPoints2"),
                    t("screens.landing.planPoints3"),
                    t("screens.landing.planPoints4"),
                    t("screens.landing.planPoints5"),
                    t("screens.landing.planPoints6"),
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login">
                  <Button className="w-full h-12 rounded-full bg-white text-primary hover:bg-white/90">
                    {t("screens.landing.planPointsCta")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground max-w-md mx-auto">
            {t("screens.landing.pricingFootnote")}
          </p>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 rounded-full">
                FAQ
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {t("screens.landing.faqTitle")}
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {[
                {
                  q: t("screens.landing.faq1q"),
                  a: t("screens.landing.faq1a"),
                },
                {
                  q: t("screens.landing.faq2q"),
                  a: t("screens.landing.faq2a"),
                },
                {
                  q: t("screens.landing.faq3q"),
                  a: t("screens.landing.faq3a"),
                },
                {
                  q: t("screens.landing.faq4q"),
                  a: t("screens.landing.faq4a"),
                },
                {
                  q: t("screens.landing.faq5q"),
                  a: t("screens.landing.faq5a"),
                },
                {
                  q: t("screens.landing.faq6q"),
                  a: t("screens.landing.faq6a"),
                },
                {
                  q: t("screens.landing.faq7q"),
                  a: t("screens.landing.faq7a"),
                },
              ].map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-background border border-border/60 rounded-2xl px-6 data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-pink-500 to-rose-500" />
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] bg-amber-200/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              {t("screens.landing.ctaTitle1")}
              <br />
              {t("screens.landing.ctaTitle2")}
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-10 leading-relaxed">
              {t("screens.landing.ctaLead1")}
              <br className="hidden sm:block" />
              {t("screens.landing.ctaLead2")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link to="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-10 rounded-full text-base bg-white text-primary hover:bg-white/95 shadow-2xl"
                >
                  {t("screens.landing.heroCtaFree")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="flex gap-3 justify-center">
                <button className="h-14 px-5 rounded-full border-2 border-white/30 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white flex items-center gap-2.5 transition-all">
                  <Apple className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-[10px] leading-tight">{t("screens.landing.comingSoon")}</div>
                    <div className="text-sm font-semibold leading-tight">App Store</div>
                  </div>
                </button>
                <button className="h-14 px-5 rounded-full border-2 border-white/30 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white flex items-center gap-2.5 transition-all">
                  <Play className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-[10px] leading-tight">{t("screens.landing.comingSoon")}</div>
                    <div className="text-sm font-semibold leading-tight">Google Play</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-white/80">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {t("screens.landing.noCreditCard")}
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {t("screens.landing.signup30s")}
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {t("screens.landing.encrypted")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-border/60 py-12 sm:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <Link to="/lp" className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-pink-400 grid place-items-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg">Collectify</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {t("screens.landing.footerTagline1")}
                <br />
                {t("screens.landing.footerTagline2")}
              </p>
            </div>
            <div>
              <div className="font-semibold mb-3 text-sm">{t("screens.landing.footerProduct")}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition">{t("screens.landing.navFeatures")}</a></li>
                <li><a href="#showcase" className="hover:text-foreground transition">{t("screens.landing.navHowTo")}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition">{t("screens.landing.navPricing")}</a></li>
                <li><a href="#faq" className="hover:text-foreground transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3 text-sm">{t("screens.landing.footerCompany")}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/login" className="hover:text-foreground transition">{t("screens.landing.navLogin")}</Link></li>
                <li><a href="https://mgc-global.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition">{t("screens.landing.footerOperator")}</a></li>
                <li><Link to="/privacy" className="hover:text-foreground transition">{t("screens.landing.footerPrivacy")}</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition">{t("screens.landing.footerTerms")}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
            <div>© {new Date().getFullYear()} Collectify by MGC inc. All rights reserved.</div>
            <div>Made with <Heart className="inline h-3 w-3 fill-primary text-primary" /> in Tokyo</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
