import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, TrendingUp, Users, Heart, Filter } from "lucide-react";
import { PostsGrid } from "@/components/posts/PostsGrid";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { CreatePostFromCollectionModal } from "@/components/posts/CreatePostFromCollectionModal";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PostsSidebar } from "@/components/posts/PostsSidebar";
import { PostsRightSidebar } from "@/components/posts/PostsRightSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Posts() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({
    selectedTags: [] as string[],
    selectedContent: "",
    searchQuery: ""
  });
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full">
        <Navbar />
        
        <div className="flex min-h-screen pt-16">
          {/* デスクトップ用左サイドバー */}
          {!isMobile && (
            <PostsSidebar onFiltersChange={setFilters} />
          )}
          
          {/* メインコンテンツ */}
          <main className={`flex-1 ${!isMobile ? 'max-w-2xl mx-auto border-x border-border' : 'px-0'}`}>
            {/* ヘッダー */}
            <div className="sticky top-16 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">投稿</h1>
                  <p className="text-sm text-muted-foreground">コレクションを共有しよう</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* モバイル用フィルターボタン */}
                  {isMobile && (
                    <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          フィルター
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80">
                        <SheetHeader>
                          <SheetTitle>投稿を絞り込み</SheetTitle>
                        </SheetHeader>
                        <div className="mt-6">
                          <PostsSidebar 
                            onFiltersChange={(newFilters) => {
                              setFilters(newFilters);
                              setIsFilterSheetOpen(false);
                            }} 
                          />
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                  
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
            </div>

            {/* 投稿一覧 */}
            <div className="pb-20">
              <PostsGrid filters={filters} />
            </div>
          </main>

          {/* デスクトップ用右サイドバー */}
          {!isMobile && (
            <PostsRightSidebar />
          )}
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