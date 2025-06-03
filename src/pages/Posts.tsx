
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Users, Heart } from "lucide-react";
import { PostsGrid } from "@/components/posts/PostsGrid";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { CreatePostFromCollectionModal } from "@/components/posts/CreatePostFromCollectionModal";

export default function Posts() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar />
      
      {/* ヘッダー部分 */}
      <div className="bg-white border-b shadow-sm pt-16 sm:pt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="font-bold text-gray-900 text-2xl">投稿一覧</h1>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow" 
              size="lg"
            >
              <Plus className="h-5 w-5" />
              投稿を作成
            </Button>
          </div>
        </div>
      </div>

      {/* 統計情報カード */}
      <div className="container mx-auto px-4 py-8">
        {/* トレンドタグ */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              トレンドタグ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["フィギュア", "アニメグッズ", "限定版", "レア", "新作"].map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* メインコンテンツ */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>最新の投稿</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="w-full max-w-4xl mx-auto">
              <PostsGrid />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フッター */}
      <Footer />

      {/* 投稿作成モーダル */}
      <CreatePostFromCollectionModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
