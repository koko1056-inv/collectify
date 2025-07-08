import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Users, Heart } from "lucide-react";
import { PostsGrid } from "@/components/posts/PostsGrid";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { CreatePostFromCollectionModal } from "@/components/posts/CreatePostFromCollectionModal";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PostsSidebar } from "@/components/posts/PostsSidebar";

export default function Posts() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    selectedTags: [] as string[],
    selectedContent: "",
    searchQuery: ""
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full">
        <Navbar />
        
        <div className="flex min-h-screen pt-16">
          {/* 左サイドバー */}
          <PostsSidebar onFiltersChange={setFilters} />
          
          {/* メインコンテンツ */}
          <main className="flex-1 max-w-2xl mx-auto border-x border-border">
            {/* ヘッダー */}
            <div className="sticky top-16 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">投稿</h1>
                  <p className="text-sm text-muted-foreground">コレクションを共有しよう</p>
                </div>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)} 
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  投稿
                </Button>
              </div>
            </div>

            {/* 投稿一覧 */}
            <div className="pb-20">
              <PostsGrid filters={filters} />
            </div>
          </main>

          {/* 右サイドバー */}
          <aside className="hidden lg:block w-80 p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  人気のタグ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">#フィギュア</Badge>
                  <Badge variant="secondary">#キーホルダー</Badge>
                  <Badge variant="secondary">#缶バッジ</Badge>
                  <Badge variant="secondary">#アクスタ</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  アクティブユーザー
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  今週の投稿数: 127件
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* フッター */}
        <Footer />

        {/* 投稿作成モーダル */}
        <CreatePostFromCollectionModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      </div>
    </SidebarProvider>
  );
}