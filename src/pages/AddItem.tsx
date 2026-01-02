
import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { BackButton } from "@/components/navigation/BackButton";
import { Package, Sparkles } from "lucide-react";

export default function AddItem() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="container mx-auto px-4 py-6 pb-20">
        {/* ヘッダー部分 */}
        <div className="max-w-2xl mx-auto">
          <BackButton className="mb-4" to="/search" />
          
          {/* タイトルセクション */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              グッズを追加
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              あなたが追加したグッズは、他のコレクターも登録できるようになります。<br />
              コミュニティを盛り上げましょう！
            </p>
          </div>

          {/* フォーム */}
          <AdminItemForm />

          {/* ヒント */}
          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">便利なヒント</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• 商品ページのURLから画像を自動取得できます</li>
                  <li>• 複数の画像を選んで一括登録も可能です</li>
                  <li>• タグを追加すると検索されやすくなります</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
