import { useState, lazy, Suspense, useCallback, memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Vote, Trophy } from "lucide-react";
import { PostsGrid } from "@/components/posts/PostsGrid";
import { PollsGrid } from "@/components/polls/PollsGrid";
import { CreatePollModal } from "@/components/polls/CreatePollModal";
import { ChallengesGrid, CreateChallengeModal } from "@/components/challenges";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";

// Lazy load heavy components
const CreatePostFromCollectionModal = lazy(() => import("@/components/posts/CreatePostFromCollectionModal").then((module) => ({
  default: module.CreatePostFromCollectionModal
})));
const PostsSidebar = lazy(() => import("@/components/posts/PostsSidebar").then((module) => ({
  default: module.PostsSidebar
})));

const Posts = memo(function Posts() {
  const { t } = useLanguage();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [filters, setFilters] = useState({
    selectedTags: [] as string[],
    selectedContent: "",
    searchQuery: "",
    selectedItemIds: [] as string[]
  });
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "likes">("newest");

  const handleFiltersChange = useCallback((newFilters: {selectedTags: string[];selectedContent: string;searchQuery: string;selectedItemIds: string[];}) => {
    setFilters(newFilters);
  }, []);

  // アクティブなフィルター数を計算
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedTags.length > 0) count++;
    if (filters.selectedContent) count++;
    if (filters.searchQuery) count++;
    if (filters.selectedItemIds.length > 0) count++;
    return count;
  }, [filters]);

  const handleCreateAction = () => {
    if (activeTab === "posts") {
      setIsCreateModalOpen(true);
    } else if (activeTab === "polls") {
      setIsCreatePollModalOpen(true);
    } else {
      setIsCreateChallengeModalOpen(true);
    }
  };

  const getCreateIcon = () => {
    if (activeTab === "posts") return <Plus className="h-6 w-6 text-primary-foreground" />;
    if (activeTab === "polls") return <Vote className="h-6 w-6 text-primary-foreground" />;
    return <Trophy className="h-6 w-6 text-primary-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        {/* サイドバー（デスクトップ） */}
        <aside className="hidden lg:block w-64 border-r border-border overflow-y-auto">
          <Suspense fallback={<Skeleton className="w-full h-96" />}>
            <PostsSidebar onFiltersChange={handleFiltersChange} />
          </Suspense>
        </aside>

        {/* メインコンテンツエリア */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* メインコンテンツ */}
          <main className="flex-1 overflow-auto">
            <div className="py-4">
              <div className="max-w-6xl mx-auto px-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="posts" className="flex-1">{t("tabs.posts")}</TabsTrigger>
                    <TabsTrigger value="polls" className="flex-1">{t("tabs.polls")}</TabsTrigger>
                    <TabsTrigger value="challenges" className="flex-1 gap-1">
                      
                      ランキング
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="posts">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFilterSheetOpen(true)}
                        className="gap-2 lg:hidden flex-shrink-0 relative">

                        <Filter className="h-4 w-4" />
                        {t("search.filter")}
                        {activeFilterCount > 0 &&
                        <Badge
                          variant="default"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">

                            {activeFilterCount}
                          </Badge>
                        }
                      </Button>
                      <Select value={sortBy} onValueChange={(value: "newest" | "popular" | "likes") => setSortBy(value)}>
                        <SelectTrigger className="w-[140px] sm:w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">{t("search.sortNewest")}</SelectItem>
                          <SelectItem value="popular">{t("search.sortPopular")}</SelectItem>
                          <SelectItem value="likes">{t("search.sortLikes")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <PostsGrid
                      filters={filters}
                      sortBy={sortBy}
                      onCreatePost={() => setIsCreateModalOpen(true)} />

                  </TabsContent>
                  
                  <TabsContent value="polls">
                    <PollsGrid onCreatePoll={() => setIsCreatePollModalOpen(true)} />
                  </TabsContent>

                  <TabsContent value="challenges">
                    <ChallengesGrid onCreateChallenge={() => setIsCreateChallengeModalOpen(true)} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* フィルターシート（モバイル） */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{t("search.filter")}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100vh-5rem)]">
            <Suspense fallback={<Skeleton className="w-full h-96" />}>
              <PostsSidebar onFiltersChange={(newFilters) => {
                handleFiltersChange(newFilters);
                setIsFilterSheetOpen(false);
              }} />
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>

      {/* フッター */}
      <Footer />

      {/* フローティングアクションボタン */}
      <button
        onClick={handleCreateAction}
        className="fixed bottom-20 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group"
        aria-label={activeTab === "posts" ? t("common.newPost") : activeTab === "polls" ? "新規投票" : "新規チャレンジ"}>

        {getCreateIcon()}
      </button>

      {/* 投稿作成モーダル */}
      <Suspense fallback={null}>
        <CreatePostFromCollectionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      </Suspense>
      
      {/* 投票作成モーダル */}
      <CreatePollModal isOpen={isCreatePollModalOpen} onClose={() => setIsCreatePollModalOpen(false)} />

      {/* チャレンジ作成モーダル */}
      <CreateChallengeModal isOpen={isCreateChallengeModalOpen} onClose={() => setIsCreateChallengeModalOpen(false)} />
    </div>);

});

export default Posts;