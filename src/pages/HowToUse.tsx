import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { 
  Search, 
  FolderOpen, 
  Heart, 
  ArrowRightLeft, 
  Home,
  Plus,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  MessageCircle,
  Users,
  Gift,
  Lightbulb,
  ArrowRight,
  Image,
  Star,
  Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// スクリーンショット画像
import guideSearchImg from "@/assets/guide-search.png";
import guidePostsImg from "@/assets/guide-posts.png";
import guideCollectionImg from "@/assets/guide-collection.png";

const featureShowcase = [
  {
    id: "search",
    title: "グッズを発見",
    subtitle: "お気に入りを見つけよう",
    description: "作品名やタグで検索して、欲しいグッズを簡単に発見。コンテンツ別にフィルタリングして、効率的にグッズを探せます。",
    image: guideSearchImg,
    color: "from-blue-500 to-cyan-500",
    steps: [
      "検索バーでキーワード入力",
      "コンテンツやタグでフィルター",
      "気になるグッズをタップ"
    ],
    action: "発見ページへ",
    path: "/search"
  },
  {
    id: "collection",
    title: "コレクション管理",
    subtitle: "大切なグッズを記録",
    description: "持っているグッズを登録して一覧で管理。購入日や価格、思い出の写真も一緒に保存できます。",
    image: guideCollectionImg,
    color: "from-green-500 to-emerald-500",
    steps: [
      "グッズをコレクションに追加",
      "詳細情報やメモを記録",
      "タグで整理して検索しやすく"
    ],
    action: "コレクションへ",
    path: "/collection"
  },
  {
    id: "community",
    title: "コミュニティ",
    subtitle: "仲間と交流しよう",
    description: "投稿でグッズを紹介したり、他のコレクターと交流。いいねやコメントで盛り上がろう！",
    image: guidePostsImg,
    color: "from-purple-500 to-pink-500",
    steps: [
      "写真付きで投稿を作成",
      "いいね・コメントで交流",
      "気になるユーザーをフォロー"
    ],
    action: "投稿を見る",
    path: "/posts"
  }
];

const quickTips = [
  {
    icon: Plus,
    title: "グッズを追加",
    description: "発見ページからワンタップで追加",
    color: "bg-blue-500"
  },
  {
    icon: Heart,
    title: "ウィッシュリスト",
    description: "欲しいグッズをブックマーク",
    color: "bg-pink-500"
  },
  {
    icon: ArrowRightLeft,
    title: "トレード",
    description: "グッズを交換できる機能",
    color: "bg-orange-500"
  },
  {
    icon: Home,
    title: "マイルーム",
    description: "グッズを飾れるバーチャル空間",
    color: "bg-purple-500"
  },
  {
    icon: Sparkles,
    title: "AIアバター",
    description: "オリジナルアバターを生成",
    color: "bg-cyan-500"
  },
  {
    icon: Gift,
    title: "ポイント",
    description: "活動でポイントが貯まる",
    color: "bg-amber-500"
  }
];

const faqs = [
  {
    q: "グッズが見つからない場合は？",
    a: "発見ページで見つからないグッズは、コレクションページから直接追加できます。「+」ボタンから写真を撮って登録しましょう。",
    icon: "🔍"
  },
  {
    q: "ポイントは何に使えますか？",
    a: "ポイントショップでコレクション枠の追加やAI画像生成の回数を購入できます。グッズ追加やログインでポイントがもらえます。",
    icon: "💎"
  },
  {
    q: "マイルームは誰でも見れますか？",
    a: "公開設定にすると他のユーザーも訪問できます。非公開にしたい場合はルーム設定から変更可能です。",
    icon: "🏠"
  },
  {
    q: "通知を受け取るには？",
    a: "プロフィールで「お気に入りの作品」を設定すると、関連する新着グッズの通知を受け取れます。",
    icon: "🔔"
  }
];

export default function HowToUse() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <main className={`${isMobile ? 'pt-20 pb-24' : 'pt-24 pb-8'}`}>
        <div className="max-w-6xl mx-auto px-4 space-y-16">
          
          {/* ヒーローセクション */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 py-8"
          >
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              <Lightbulb className="w-4 h-4 mr-2" />
              はじめての方へ
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Collectify
              </span>
              の使い方
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              推しグッズを記録・管理・共有できるアプリです。
              <br className="hidden md:block" />
              コレクションをもっと楽しくしましょう！
            </p>
          </motion.section>

          {/* メイン機能ショーケース */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold">主な機能</h2>
              <p className="text-muted-foreground mt-2">スクリーンショットで使い方をチェック</p>
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
                    <div className={`grid ${isMobile ? 'grid-cols-1' : index % 2 === 0 ? 'md:grid-cols-2' : 'md:grid-cols-2'}`}>
                      {/* 画像セクション */}
                      <div className={`relative overflow-hidden ${!isMobile && index % 2 === 1 ? 'md:order-2' : ''}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10`} />
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-full object-cover object-top aspect-video md:aspect-auto"
                        />
                        <div className={`absolute top-4 ${index % 2 === 0 ? 'left-4' : 'right-4'}`}>
                          <Badge className={`bg-gradient-to-r ${feature.color} text-white border-0`}>
                            <Star className="w-3 h-3 mr-1" />
                            STEP {index + 1}
                          </Badge>
                        </div>
                      </div>

                      {/* コンテンツセクション */}
                      <div className="p-6 md:p-8 flex flex-col justify-center bg-card">
                        <div className="space-y-4">
                          <div>
                            <p className={`text-sm font-medium bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                              {feature.subtitle}
                            </p>
                            <h3 className="text-2xl md:text-3xl font-bold mt-1">{feature.title}</h3>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                          
                          <div className="space-y-2 pt-2">
                            {feature.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-white text-xs font-bold`}>
                                  {stepIndex + 1}
                                </div>
                                <span className="text-sm">{step}</span>
                              </div>
                            ))}
                          </div>

                          <Button 
                            className={`mt-4 bg-gradient-to-r ${feature.color} hover:opacity-90 transition-opacity text-white`}
                            onClick={() => navigate(feature.path)}
                          >
                            {feature.action}
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
                <Zap className="w-6 h-6 text-primary" />
                便利な機能
              </h2>
              <p className="text-muted-foreground mt-2">もっと楽しく使いこなそう</p>
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
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-4 md:p-6 text-center space-y-3">
                      <div className={`w-12 h-12 mx-auto rounded-xl ${tip.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <tip.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold">{tip.title}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">{tip.description}</p>
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
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                    <Gift className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl md:text-2xl font-bold">ポイントを貯めてお得に！</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 bg-background/50 rounded-lg p-3">
                        <span className="text-xl">📦</span>
                        <div>
                          <div className="font-medium">グッズ追加</div>
                          <div className="text-primary font-bold">+10pt</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-background/50 rounded-lg p-3">
                        <span className="text-xl">📅</span>
                        <div>
                          <div className="font-medium">毎日ログイン</div>
                          <div className="text-primary font-bold">+5pt</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-background/50 rounded-lg p-3">
                        <span className="text-xl">📸</span>
                        <div>
                          <div className="font-medium">投稿作成</div>
                          <div className="text-primary font-bold">+15pt</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => navigate("/shop")} size="lg" className="shrink-0">
                    ショップへ
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.section>

          {/* よくある質問 */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold">よくある質問</h2>
              <p className="text-muted-foreground mt-2">困ったときはこちら</p>
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
                        <span className="text-2xl">{faq.icon}</span>
                        <div className="space-y-2">
                          <h3 className="font-bold text-base">{faq.q}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
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
              さっそく始めましょう！
            </h2>
            <p className="text-muted-foreground text-lg">
              あなたのコレクションライフを、もっと楽しく。
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="text-base px-8" onClick={() => navigate("/search")}>
                <Search className="w-5 h-5 mr-2" />
                グッズを探す
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" onClick={() => navigate("/my-room")}>
                <Home className="w-5 h-5 mr-2" />
                マイルームへ
              </Button>
            </div>
          </motion.section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
