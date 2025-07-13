import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Filter } from "lucide-react";
import { PostsGrid } from "@/components/posts/PostsGrid";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { CreatePostFromCollectionModal } from "@/components/posts/CreatePostFromCollectionModal";
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        {/* デスクトップ用左サイドバー */}
        {!isMobile && (
          <div className="w-64 flex-shrink-0">
            <PostsSidebar onFiltersChange={setFilters} />
          </div>
        )}
        
        {/* メインコンテンツエリア */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ヘッダー */}
          <div className={`bg-background border-b border-border sticky top-16 z-10 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
            <div className="flex items-center justify-between max-w-4xl mx-auto">
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
                    <SheetContent side="left" className="w-80 p-0">
                      <SheetHeader className="p-4 pb-2">
                        <SheetTitle>投稿を絞り込み</SheetTitle>
                      </SheetHeader>
                      <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <PostsSidebar 
                          onFiltersChange={(newFilters) => {
                            setFilters(newFilters);
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

          {/* メインコンテンツ */}
          <main className="flex-1 overflow-auto">
            <div className={`${isMobile ? 'px-4' : 'px-6'} py-4`}>
              <div className="max-w-4xl mx-auto">
                <PostsGrid filters={filters} />
              </div>
            </div>
          </main>
        </div>

        {/* デスクトップ用右サイドバー */}
        {!isMobile && (
          <div className="w-80 flex-shrink-0">
            <PostsRightSidebar />
          </div>
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
  );
}