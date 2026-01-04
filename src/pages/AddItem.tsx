import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { ChatAddItem } from "@/components/add-item/ChatAddItem";
import { BackButton } from "@/components/navigation/BackButton";
import { Package, Sparkles, MessageSquare, FormInput } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function AddItem() {
  const [activeTab, setActiveTab] = useState<"form" | "chat">("form");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-20">
        {/* ヘッダー部分 */}
        <div className="max-w-2xl mx-auto">
          <BackButton className="mb-6" to="/search" />
          
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

          {/* タブ切り替え */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "form" | "chat")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="form" className="gap-2">
                <FormInput className="h-4 w-4" />
                フォーム入力
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                AIチャット
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="mt-0">
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
            </TabsContent>

            <TabsContent value="chat" className="mt-0">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-0">
                  <ChatAddItem />
                </CardContent>
              </Card>

              {/* チャットモードのヒント */}
              <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-1">AIチャットモード</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• 画像を送ると自動で情報を推測します</li>
                      <li>• 会話形式で楽しく入力できます</li>
                      <li>• わからない項目はスキップできます</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
