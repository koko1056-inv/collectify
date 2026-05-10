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
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Page-specific SEO meta tags + JSON-LD structured data
  useEffect(() => {
    const TITLE = "Collectify｜推しグッズコレクション × AI 3D推し部屋 × 推し友マッチング";
    const DESC =
      "推しグッズを記録して、AIが3D推し部屋に。推し友も見つかる、まったく新しい推し活アプリ。アニメ・ゲーム・アイドル・Vtuber・K-POP対応。基本無料、クレカ登録不要で30秒登録。";
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
              機能
            </a>
            <a href="#showcase" className="text-muted-foreground hover:text-foreground transition">
              使い方
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">
              料金
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition">
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="rounded-full">
                ログイン
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-primary to-pink-400 hover:opacity-90 text-white shadow-lg shadow-primary/25"
              >
                はじめる
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="メニュー"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileNavOpen(false)} className="py-2">機能</a>
              <a href="#showcase" onClick={() => setMobileNavOpen(false)} className="py-2">使い方</a>
              <a href="#pricing" onClick={() => setMobileNavOpen(false)} className="py-2">料金</a>
              <a href="#faq" onClick={() => setMobileNavOpen(false)} className="py-2">FAQ</a>
              <Link to="/login" className="pt-2">
                <Button className="w-full rounded-full bg-gradient-to-r from-primary to-pink-400 text-white">
                  はじめる
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
                推し活、新時代へ
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1]">
                推しのすべてを、
                <br />
                <span className="bg-gradient-to-r from-primary via-pink-500 to-rose-400 bg-clip-text text-transparent">
                  ひとつのルーム
                </span>
                へ。
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
                推しグッズを記録して、AIが3D推し部屋に。
                <br className="hidden sm:block" />
                推し友も見つかる、まったく新しい推し活アプリ。
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-14 px-8 rounded-full text-base bg-gradient-to-r from-primary to-pink-400 hover:opacity-90 text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all"
                  >
                    無料ではじめる
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-8 rounded-full text-base border-2"
                  >
                    機能を見る
                  </Button>
                </a>
              </div>

              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  クレカ登録不要
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  完全無料で開始
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
                    推し活女子に愛されるアプリ
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
                      alt="Collectify アプリ画面"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-background border border-border/60 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-100 grid place-items-center">
                    <Heart className="h-5 w-5 text-primary fill-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">登録グッズ</div>
                    <div className="font-bold text-sm">128 個</div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 bg-background border border-border/60 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center">
                    <Trophy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">ランク</div>
                    <div className="font-bold text-sm">推しマスター</div>
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
              こんなお悩み、ありませんか？
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              推し活、楽しいけど
              <br />
              <span className="text-muted-foreground">困りごとも、いっぱい。</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                emoji: "😱",
                title: "あ、これ持ってた…",
                desc: "イベントで同じグッズをまた買ってしまった。家に帰って気づくあの絶望感、もう味わいたくない。",
              },
              {
                emoji: "📦",
                title: "どこに何があるか分からない",
                desc: "コレクションが増えすぎて、お気に入りのアクスタが行方不明。整理したいけど時間がない。",
              },
              {
                emoji: "💔",
                title: "推し友がいない…",
                desc: "同じ推しを語り合える人と出会いたい。グッズ交換もしたいけど、SNSは敷居が高い。",
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
              Collectify が解決します
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              推し活の、
              <span className="bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-transparent">
                ぜんぶをひとつに。
              </span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              管理も、共有も、出会いも。あなたの推し活がもっと楽しくなる3つの軸。
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
                  グッズを、
                  <br />
                  ぜんぶ記録。
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  写真を撮って、タグをつけるだけ。あなたの推しグッズを丸ごとデジタル化。ダブり買いとはこれでお別れ。
                </p>
                <ul className="space-y-2 text-sm">
                  {["AI画像認識で自動タグ付け", "瞬時に重複チェック", "推し別・カテゴリ別に整理"].map((t) => (
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
                ✨ いちばん人気
              </Badge>
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center mb-6 shadow-xl">
                  <Wand2 className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  AIが、推し部屋を
                  <br />
                  3Dで魔法のように。
                </h3>
                <p className="text-white/90 leading-relaxed mb-6">
                  あなたのコレクションから、AIがあなただけの3D推し部屋を生成。飾って、眺めて、シェアして。理想の推し空間を手のひらに。
                </p>
                <ul className="space-y-2 text-sm">
                  {["コレクションから自動レイアウト", "テーマ・色・小物を自由カスタム", "URLでお部屋をシェア"].map((t) => (
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
                  推し友が、
                  <br />
                  きっと見つかる。
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  あなたと同じ推しを愛する人と出会える。グッズ交換、語り合い、イベント参加。推し活仲間と新しい体験を。
                </p>
                <ul className="space-y-2 text-sm">
                  {["コレクションでマッチング", "安全なトレード機能", "メッセージで交流"].map((t) => (
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
              できること、まだまだ。
            </h2>
          </div>

          <div className="space-y-20 sm:space-y-28">
            {[
              {
                badge: "コレクション管理",
                title: "撮るだけで、瞬間整理。",
                desc: "推しグッズの写真を撮るだけで、AIが自動でタグ付け。タイトルや作品名も自動入力。あなたは、推しを愛でることに専念できます。",
                features: ["AI画像認識", "自動タグ付け", "メモ・購入日も記録"],
                img: guideCollection,
                reverse: false,
              },
              {
                badge: "推し友マッチング",
                title: "同じ推しの、ベストフレンドへ。",
                desc: "あなたのコレクションが、推し友との出会いの鍵。共通の推しを持つ人を発見し、コミュニティでつながり、トレードも安心。",
                features: ["コレクション・マッチング", "ウィッシュリスト共有", "安全なトレード機能"],
                img: onboardingCommunity,
                reverse: true,
              },
              {
                badge: "イベント・チャレンジ",
                title: "みんなで楽しむ、推し活イベント。",
                desc: "「今月のお気に入り」「コレクションの数選手権」など、推し活がもっと盛り上がるチャレンジ機能。仲間と楽しむ毎日を。",
                features: ["週・月チャレンジ", "ランキング機能", "獲得バッジで実績可視化"],
                img: guidePosts,
                reverse: false,
              },
              {
                badge: "画像検索",
                title: "気になるグッズ、写真ひとつで。",
                desc: "イベントやお店で見かけたグッズを、写真を撮るだけで検索。あなたのコレクションに既にあるか瞬時にチェック。",
                features: ["画像で重複チェック", "グッズ情報を自動表示", "ウィッシュリストへ追加"],
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
              他にも、推しを彩る機能たち。
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { icon: Camera, title: "投稿フィード", desc: "推しグッズをシェア" },
              { icon: Repeat, title: "トレード", desc: "安心のグッズ交換" },
              { icon: MessageCircle, title: "メッセージ", desc: "推し友と直接交流" },
              { icon: Search, title: "コンテンツ探索", desc: "新しい推しを発見" },
              { icon: Gift, title: "ウィッシュリスト", desc: "欲しいグッズを記録" },
              { icon: Trophy, title: "実績バッジ", desc: "コレクションを証明" },
              { icon: Star, title: "ポイントシステム", desc: "貯めて使える特典" },
              { icon: Heart, title: "お気に入り", desc: "とっておきを保存" },
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
              すべての"推し"に、対応。
            </h2>
            <p className="text-lg text-muted-foreground">
              アニメ、ゲーム、アイドル、声優、Vtuber、K-POP、スポーツ、漫画家。
              <br className="hidden sm:block" />
              あなたの推しがどんなジャンルでも、Collectifyはひと括り。
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
            {[
              "アニメ", "ゲーム", "アイドル", "声優", "Vtuber", "K-POP", "JPop",
              "漫画", "映画", "ドラマ", "舞台", "声優ライブ", "コミック",
              "アクスタ", "缶バッジ", "ぬいぐるみ", "フィギュア", "ポスター",
              "ラバスト", "クリアファイル", "限定グッズ", "ライブグッズ",
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
              料金プラン
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              基本は、ぜんぶ無料。
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              もっと拡張したくなったら、ポイントでアンロック。
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-background rounded-3xl border border-border/60 p-8 lg:p-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">FREE</div>
                  <div className="text-3xl font-bold">無料プラン</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-secondary grid place-items-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="text-4xl font-bold mb-1">¥0</div>
              <div className="text-sm text-muted-foreground mb-8">永年無料</div>
              <ul className="space-y-3 mb-8">
                {[
                  "コレクション登録 100枠",
                  "マイルーム 1部屋",
                  "カスタムタグ 10個",
                  "推し友マッチング無制限",
                  "トレード機能",
                  "投稿・メッセージ",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login">
                <Button variant="outline" className="w-full h-12 rounded-full">
                  無料ではじめる
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
                    <div className="text-3xl font-bold">ポイント拡張</div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-4xl font-bold mb-1">¥120 〜</div>
                <div className="text-sm text-white/80 mb-8">必要な分だけ</div>
                <ul className="space-y-3 mb-8">
                  {[
                    "コレクション枠 +50/+100",
                    "マイルーム 追加",
                    "カスタムタグ 拡張",
                    "AI画像生成",
                    "限定アバター・テーマ",
                    "プレミアム機能アンロック",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login">
                  <Button className="w-full h-12 rounded-full bg-white text-primary hover:bg-white/90">
                    アプリで購入
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground max-w-md mx-auto">
            ポイントは消費型（Consumable）のApple In-App Purchaseです。サブスクではないので、必要な時だけ購入できます。
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
                よくあるご質問
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {[
                {
                  q: "完全に無料で使えますか？",
                  a: "はい、基本機能はすべて無料でお使いいただけます。コレクション登録、マイルーム作成、推し友マッチング、トレード、メッセージ機能などすべて無料です。コレクション枠の追加や限定機能のみ、ポイント購入で利用できます。",
                },
                {
                  q: "iOSとAndroidの両方で使えますか？",
                  a: "現在iOS版を準備中です。Webアプリ版は既に利用可能で、ブラウザからすぐにご利用いただけます。Android版も今後リリース予定です。",
                },
                {
                  q: "コレクション写真は安全に保管されますか？",
                  a: "はい、すべてのデータはエンタープライズグレードのSupabaseクラウドストレージに暗号化して保管されます。アカウントを削除すれば、データもすべて削除されます。",
                },
                {
                  q: "推し友とのトレードは安全ですか？",
                  a: "Collectifyのトレード機能には、相互評価システムと運営によるサポート体制があります。初回トレード時は実績のあるユーザーから始めることをおすすめしています。",
                },
                {
                  q: "AIで作る3D推し部屋ってどんな感じ？",
                  a: "あなたが登録したコレクションを元に、AIが自動でレイアウトを提案します。部屋のスタイル（モダン・ガーリー・カフェ風など）も自由に選べます。完成したお部屋はURLで友だちにシェアできます。",
                },
                {
                  q: "ポイントは何に使えますか？",
                  a: "コレクション登録枠の追加、マイルーム部屋数の追加、カスタムタグ枠拡張、AI画像生成、限定アバター・テーマなどに使用できます。サブスクではないので、必要な時だけ購入できます。",
                },
                {
                  q: "退会・データ削除はできますか？",
                  a: "はい、設定画面からいつでも退会いただけます。退会時にはすべての個人データが30日以内に完全削除されます。",
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
              さあ、あなたの推しを、
              <br />
              もっと愛そう。
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-10 leading-relaxed">
              登録は30秒。今すぐCollectifyを始めて、
              <br className="hidden sm:block" />
              あなただけの推し活体験をはじめましょう。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link to="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-10 rounded-full text-base bg-white text-primary hover:bg-white/95 shadow-2xl"
                >
                  無料ではじめる
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="flex gap-3 justify-center">
                <button className="h-14 px-5 rounded-full border-2 border-white/30 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white flex items-center gap-2.5 transition-all">
                  <Apple className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-[10px] leading-tight">準備中</div>
                    <div className="text-sm font-semibold leading-tight">App Store</div>
                  </div>
                </button>
                <button className="h-14 px-5 rounded-full border-2 border-white/30 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white flex items-center gap-2.5 transition-all">
                  <Play className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-[10px] leading-tight">準備中</div>
                    <div className="text-sm font-semibold leading-tight">Google Play</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-white/80">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                クレカ登録不要
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                30秒で登録完了
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                データ暗号化保管
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
                推し活、もっと自由に、もっと楽しく。
                <br />
                あなたの推しを、ひとつのルームに。
              </p>
            </div>
            <div>
              <div className="font-semibold mb-3 text-sm">プロダクト</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition">機能</a></li>
                <li><a href="#showcase" className="hover:text-foreground transition">使い方</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition">料金</a></li>
                <li><a href="#faq" className="hover:text-foreground transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3 text-sm">会社情報</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/login" className="hover:text-foreground transition">ログイン</Link></li>
                <li><a href="https://mgc-global.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition">運営：MGC inc.</a></li>
                <li><Link to="/privacy" className="hover:text-foreground transition">プライバシーポリシー</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition">利用規約</Link></li>
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
