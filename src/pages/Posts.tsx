import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Filter } from "lucide-react";
import { PostsGrid } from "@/components/posts/PostsGrid";
import { PollsGrid } from "@/components/polls/PollsGrid";
import { CreatePollModal } from "@/components/polls/CreatePollModal";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy components
const CreatePostFromCollectionModal = lazy(() => import("@/components/posts/CreatePostFromCollectionModal").then(module => ({
  default: module.CreatePostFromCollectionModal
})));
const PostsSidebar = lazy(() => import("@/components/posts/PostsSidebar").then(module => ({
  default: module.PostsSidebar
})));
export default function Posts() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [filters, setFilters] = useState({
    selectedTags: [] as string[],
    selectedContent: "",
    searchQuery: ""
  });
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        {/* メインコンテンツエリア */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ヘッダー */}
          

          {/* メインコンテンツ */}
          <main className="flex-1 overflow-auto">
            <div className="px-4 py-4">
              <div className="max-w-4xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="posts" className="flex-1">投稿</TabsTrigger>
                    <TabsTrigger value="polls" className="flex-1">投票</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="posts">
                    <PostsGrid filters={filters} />
                  </TabsContent>
                  
                  <TabsContent value="polls">
                    <PollsGrid />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* フッター */}
      <Footer />

      {/* フローティングアクションボタン（投稿用） */}
      {activeTab === "posts" && <button onClick={() => setIsCreateModalOpen(true)} className="fixed bottom-20 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95" aria-label="新規投稿">
          <Plus className="h-6 w-6 text-primary-foreground" />
        </button>}

      {/* 投稿作成モーダル */}
      <Suspense fallback={null}>
        <CreatePostFromCollectionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      </Suspense>
      
      {/* 投票作成モーダル */}
      <CreatePollModal isOpen={isCreatePollModalOpen} onClose={() => setIsCreatePollModalOpen(false)} />
    </div>;
}