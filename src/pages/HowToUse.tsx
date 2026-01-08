import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Search, 
  FolderOpen, 
  Heart, 
  Users, 
  ArrowRightLeft, 
  Home,
  Plus,
  Camera,
  Tag,
  MessageCircle,
  Bell,
  Share2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "グッズを発見",
    description: "発見ページで新しいグッズを探しましょう。キーワード検索やタグでフィルタリングできます。",
    steps: [
      "下部メニューの「発見」をタップ",
      "検索バーでキーワードを入力",
      "タグでフィルタリング",
      "気になるグッズをタップして詳細を確認"
    ]
  },
  {
    icon: Plus,
    title: "コレクションに追加",
    description: "持っているグッズをコレクションに追加して管理しましょう。",
    steps: [
      "グッズ詳細ページで「コレクションに追加」をタップ",
      "または発見ページから直接追加",
      "数量やメモを設定可能"
    ]
  },
  {
    icon: Heart,
    title: "ウィッシュリスト",
    description: "欲しいグッズをウィッシュリストに追加して、いつでも確認できます。",
    steps: [
      "グッズ詳細ページで買い物かごアイコンをタップ",
      "プロフィールページでウィッシュリストを確認",
      "価格検索機能で最安値を探す"
    ]
  },
  {
    icon: FolderOpen,
    title: "コレクション管理",
    description: "自分のコレクションを一覧で確認・管理できます。",
    steps: [
      "下部メニューの「コレクション」をタップ",
      "タグや作品名でフィルタリング",
      "グッズをタップして詳細を編集",
      "思い出の写真を追加"
    ]
  },
  {
    icon: Home,
    title: "マイルーム",
    description: "お気に入りのグッズを飾れるバーチャルルームです。",
    steps: [
      "下部メニューの「ホーム」をタップ",
      "グッズをドラッグ＆ドロップで配置",
      "背景をカスタマイズ",
      "他のユーザーのルームも訪問可能"
    ]
  },
  {
    icon: Camera,
    title: "アバター作成",
    description: "AIでオリジナルアバターを生成できます。",
    steps: [
      "ホーム画面のアバターをタップ",
      "「アバターを作成」を選択",
      "プロンプトを入力してAI生成",
      "または画像をアップロード"
    ]
  },
  {
    icon: ArrowRightLeft,
    title: "トレード",
    description: "他のユーザーとグッズを交換できます。",
    steps: [
      "コレクションページで「トレード」タブを選択",
      "交換に出したいグッズを選択",
      "マッチング機能で交換相手を探す",
      "メッセージでやり取り"
    ]
  },
  {
    icon: Users,
    title: "フォロー・フォロワー",
    description: "気になるコレクターをフォローして、最新情報をチェック。",
    steps: [
      "ユーザープロフィールでフォローボタンをタップ",
      "フォロー中のユーザーの投稿を確認",
      "コミュニティでつながる"
    ]
  },
  {
    icon: MessageCircle,
    title: "コミュニティ",
    description: "投稿やアンケートでコミュニティと交流しましょう。",
    steps: [
      "下部メニューの「コミュニティ」をタップ",
      "投稿を作成してグッズを紹介",
      "他のユーザーの投稿にいいね・コメント",
      "アンケートに参加"
    ]
  },
  {
    icon: Bell,
    title: "通知",
    description: "新着グッズやフォロワーからの通知を受け取れます。",
    steps: [
      "ヘッダーのベルアイコンをタップ",
      "お気に入りの作品に関連する新着グッズをチェック",
      "トレードリクエストの通知を確認"
    ]
  },
  {
    icon: Tag,
    title: "タグ管理",
    description: "グッズにタグを付けて整理・検索しやすくします。",
    steps: [
      "グッズ詳細ページでタグを追加",
      "公式タグと個人タグを使い分け",
      "タグでコレクションをフィルタリング"
    ]
  },
  {
    icon: Share2,
    title: "シェア",
    description: "コレクションやマイルームをSNSでシェアできます。",
    steps: [
      "プロフィールページでシェアボタンをタップ",
      "Twitter、LINE、リンクコピーに対応",
      "友達とコレクションを共有"
    ]
  }
];

export default function HowToUse() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className={`container mx-auto ${isMobile ? 'pt-28 pb-24 px-4' : 'pt-24 pb-8 px-4'}`}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">使い方ガイド</h1>
            <p className="text-muted-foreground">
              Collectifyの機能をご紹介します
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    {feature.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {stepIndex + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">💡 ヒント</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• プロフィールで「お気に入りの作品」を設定すると、関連する新着グッズの通知を受け取れます</p>
              <p>• コレクションにグッズを追加するとポイントがもらえます</p>
              <p>• マイルームは他のユーザーも訪問できます。素敵なルームを作りましょう！</p>
              <p>• 困ったことがあればメッセージ機能でお問い合わせください</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}