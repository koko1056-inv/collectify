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
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const quickStartSteps = [
  {
    step: 1,
    title: "グッズを発見",
    description: "発見ページで好きな作品のグッズを探しましょう",
    icon: Search,
    color: "bg-blue-500",
    action: "発見ページへ",
    path: "/search"
  },
  {
    step: 2,
    title: "コレクションに追加",
    description: "持っているグッズを登録して管理しましょう",
    icon: Plus,
    color: "bg-green-500",
    action: "コレクションへ",
    path: "/collection"
  },
  {
    step: 3,
    title: "マイルームを飾る",
    description: "お気に入りのグッズを飾って自分だけの空間を作ろう",
    icon: Home,
    color: "bg-purple-500",
    action: "マイルームへ",
    path: "/my-room"
  }
];

const featureCategories = [
  {
    id: "collect",
    label: "集める",
    icon: FolderOpen,
    features: [
      {
        title: "グッズを発見",
        description: "キーワードやタグで欲しいグッズを簡単に検索。新着グッズも毎日更新されます。",
        tips: [
          "作品名やキャラクター名で検索",
          "タグでジャンル別にフィルタリング",
          "新着順・人気順で並び替え"
        ]
      },
      {
        title: "コレクション管理",
        description: "持っているグッズを一覧で管理。数量やメモも記録できます。",
        tips: [
          "グッズをタップして詳細を編集",
          "思い出の写真を追加",
          "購入日や価格を記録"
        ]
      },
      {
        title: "ウィッシュリスト",
        description: "欲しいグッズを保存しておけば、いつでも確認できます。",
        tips: [
          "買い物かごアイコンで追加",
          "価格検索で最安値をチェック",
          "ゲットしたらコレクションに移動"
        ]
      }
    ]
  },
  {
    id: "create",
    label: "作る",
    icon: Sparkles,
    features: [
      {
        title: "マイルーム",
        description: "バーチャルルームにグッズを自由に配置。あなただけの空間を作りましょう。",
        tips: [
          "グッズをドラッグ＆ドロップ",
          "背景を自由にカスタマイズ",
          "他のユーザーに公開可能"
        ]
      },
      {
        title: "AIアバター",
        description: "AIがあなただけのオリジナルアバターを生成。プロフィール画像に設定できます。",
        tips: [
          "好きなスタイルをプロンプトで指定",
          "画像からアバターを作成",
          "ギャラリーに保存して管理"
        ]
      }
    ]
  },
  {
    id: "connect",
    label: "つながる",
    icon: Users,
    features: [
      {
        title: "トレード",
        description: "他のコレクターとグッズを交換。欲しいものと交換できるかも？",
        tips: [
          "交換に出せるグッズを登録",
          "マッチング機能で相手を探す",
          "メッセージで条件を相談"
        ]
      },
      {
        title: "コミュニティ",
        description: "投稿でグッズを紹介したり、他のコレクターと交流しましょう。",
        tips: [
          "写真付きで投稿を作成",
          "いいね・コメントで交流",
          "アンケートに参加"
        ]
      },
      {
        title: "フォロー",
        description: "気になるコレクターをフォローして、最新情報をチェック。",
        tips: [
          "プロフィールからフォロー",
          "ルームを訪問して参考に",
          "通知で更新をキャッチ"
        ]
      }
    ]
  }
];

const faqs = [
  {
    q: "グッズが見つからない場合は？",
    a: "発見ページで見つからないグッズは、コレクションページから直接追加できます。「+」ボタンから写真を撮って登録しましょう。"
  },
  {
    q: "ポイントは何に使えますか？",
    a: "ポイントショップでコレクション枠の追加やAI画像生成の回数を購入できます。グッズ追加やログインでポイントがもらえます。"
  },
  {
    q: "マイルームは誰でも見れますか？",
    a: "はい、公開設定にすると他のユーザーも訪問できます。非公開にしたい場合はルーム設定から変更できます。"
  },
  {
    q: "通知を受け取るには？",
    a: "プロフィールで「お気に入りの作品」を設定すると、関連する新着グッズの通知を受け取れます。"
  }
];

export default function HowToUse() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("collect");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className={`container mx-auto ${isMobile ? 'pt-28 pb-24 px-4' : 'pt-24 pb-8 px-4'}`}>
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* ヒーローセクション */}
          <section className="text-center space-y-4 py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Lightbulb className="w-4 h-4" />
              はじめての方へ
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Collectifyの使い方
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              あなたのコレクションを、もっと楽しく。
              <br />
              簡単3ステップで始められます。
            </p>
          </section>

          {/* クイックスタート */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-center">🚀 クイックスタート</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {quickStartSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${step.color} flex items-center justify-center text-white font-bold`}>
                          {step.step}
                        </div>
                        <div className={`p-2 rounded-lg ${step.color}/10`}>
                          <step.icon className={`w-5 h-5 ${step.color.replace('bg-', 'text-')}`} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => navigate(step.path)}
                      >
                        {step.action}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* 機能別ガイド */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-center">📚 機能ガイド</h2>
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                {featureCategories.map((cat) => (
                  <TabsTrigger 
                    key={cat.id} 
                    value={cat.id}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <cat.icon className="w-4 h-4" />
                    <span className={isMobile ? "hidden" : ""}>{cat.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {featureCategories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="space-y-4">
                  {cat.features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="p-5 border-b bg-muted/30">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <ChevronRight className="w-5 h-5 text-primary" />
                              {feature.title}
                            </h3>
                            <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                          </div>
                          <div className="p-5 bg-background">
                            <ul className="space-y-2">
                              {feature.tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="flex items-start gap-3 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </section>

          {/* よくある質問 */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-center">❓ よくある質問</h2>
            <div className="grid gap-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-5">
                    <h3 className="font-bold text-base flex items-start gap-2">
                      <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      {faq.q}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 pl-7">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ヒントセクション */}
          <section>
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="p-4 rounded-2xl bg-primary/10">
                    <Gift className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-bold">ポイントを貯めてお得に使おう！</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✨ グッズをコレクションに追加すると <strong>+10pt</strong></li>
                      <li>✨ 毎日ログインで <strong>+5pt</strong></li>
                      <li>✨ 投稿を作成すると <strong>+15pt</strong></li>
                    </ul>
                  </div>
                  <Button onClick={() => navigate("/shop")} className="shrink-0">
                    ポイントショップ
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <section className="text-center py-8 space-y-4">
            <h2 className="text-2xl font-bold">さっそく始めましょう！</h2>
            <p className="text-muted-foreground">あなたのコレクションライフを、もっと楽しく。</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/search")}>
                <Search className="w-5 h-5 mr-2" />
                グッズを探す
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/my-room")}>
                <Home className="w-5 h-5 mr-2" />
                マイルームへ
              </Button>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}