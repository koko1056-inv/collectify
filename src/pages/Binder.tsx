import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useBinder } from "@/hooks/useBinder";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Pencil, Trash2, Grid3x3, FolderOpen, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BinderEditor } from "@/components/binder/BinderEditor";
import { BinderPagePreview } from "@/components/binder/BinderPagePreview";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Binder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { binders, isLoadingBinders, createBinder, deleteBinder } = useBinder();
  const [selectedBinderId, setSelectedBinderId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBinderTitle, setNewBinderTitle] = useState("");
  const [newBinderDescription, setNewBinderDescription] = useState("");

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleCreateBinder = async () => {
    if (!newBinderTitle.trim()) return;
    
    await createBinder.mutateAsync({
      title: newBinderTitle,
      description: newBinderDescription,
    });
    
    setNewBinderTitle("");
    setNewBinderDescription("");
    setIsCreateDialogOpen(false);
  };

  const handleDeleteBinder = async (id: string) => {
    if (confirm("このバインダーとすべてのページを削除しますか?")) {
      await deleteBinder.mutateAsync(id);
    }
  };

  if (selectedPageId) {
    return (
      <BinderEditor
        pageId={selectedPageId}
        binderId={selectedBinderId || undefined}
        onClose={() => {
          setSelectedPageId(null);
          setIsPreviewMode(false);
        }}
        isPreviewMode={isPreviewMode}
      />
    );
  }

  // バインダーが選択されている場合はページ一覧を表示
  if (selectedBinderId) {
    return (
      <BinderPagesView
        binderId={selectedBinderId}
        onBack={() => setSelectedBinderId(null)}
        onSelectPage={(pageId) => {
          setSelectedPageId(pageId);
          setIsPreviewMode(true);
        }}
        onEditPage={(pageId) => {
          setSelectedPageId(pageId);
          setIsPreviewMode(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className="container mx-auto pt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
          <div className="flex items-center justify-between gap-2 md:gap-3 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">マイバインダー</h1>
                <p className="text-xs md:text-sm text-muted-foreground">バインダーを管理</p>
              </div>
            </div>
          </div>

          {isLoadingBinders ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              </div>
            </div>
          ) : binders.length === 0 ? (
            <Card className="p-8 md:p-12 text-center bg-white shadow-sm border-dashed border-2">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <FolderOpen className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">バインダーがありません</h3>
                  <p className="text-sm text-muted-foreground">
                    新しいバインダーを作成して、グッズを整理しましょう！
                  </p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 shadow-sm hover:shadow-md transition-all mt-4">
                      <Plus className="w-4 h-4" />
                      最初のバインダーを作成
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新しいバインダーを作成</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">タイトル</Label>
                        <Input
                          id="title"
                          value={newBinderTitle}
                          onChange={(e) => setNewBinderTitle(e.target.value)}
                          placeholder="例: 推しグッズコレクション"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">説明（任意）</Label>
                        <Textarea
                          id="description"
                          value={newBinderDescription}
                          onChange={(e) => setNewBinderDescription(e.target.value)}
                          placeholder="バインダーの説明を入力..."
                          rows={3}
                        />
                      </div>
                      <Button 
                        onClick={handleCreateBinder} 
                        className="w-full"
                        disabled={!newBinderTitle.trim()}
                      >
                        作成
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {binders.map((binder) => (
                <Card
                  key={binder.id}
                  className="overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 hover:border-primary/20"
                  onClick={() => setSelectedBinderId(binder.id)}
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                    {binder.cover_image ? (
                      <img
                        src={binder.cover_image}
                        alt={binder.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FolderOpen className="w-20 h-20 text-primary/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8 bg-white/90 hover:bg-destructive hover:text-white backdrop-blur-sm shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBinder(binder.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="absolute bottom-3 right-3 z-10">
                      <ChevronRight className="w-6 h-6 text-white drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-lg truncate text-gray-900 group-hover:text-primary transition-colors">
                      {binder.title}
                    </h3>
                    {binder.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {binder.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(binder.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Floating Action Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいバインダーを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={newBinderTitle}
                onChange={(e) => setNewBinderTitle(e.target.value)}
                placeholder="例: 推しグッズコレクション"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                value={newBinderDescription}
                onChange={(e) => setNewBinderDescription(e.target.value)}
                placeholder="バインダーの説明を入力..."
                rows={3}
              />
            </div>
            <Button 
              onClick={handleCreateBinder} 
              className="w-full"
              disabled={!newBinderTitle.trim()}
            >
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}

// バインダー内のページ一覧を表示するコンポーネント
function BinderPagesView({
  binderId,
  onBack,
  onSelectPage,
  onEditPage,
}: {
  binderId: string;
  onBack: () => void;
  onSelectPage: (pageId: string) => void;
  onEditPage: (pageId: string) => void;
}) {
  const navigate = useNavigate();
  const { getBinderPages } = useBinder();
  const { deletePage } = useBinder();
  const pagesQuery = getBinderPages(binderId);
  const pages = pagesQuery.data || [];

  const handleDeletePage = async (pageId: string) => {
    if (confirm("このページを削除しますか?")) {
      await deletePage.mutateAsync({ id: pageId, binderId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className="container mx-auto pt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 md:gap-3 bg-white p-4 rounded-lg shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">ページ一覧</h1>
              <p className="text-xs md:text-sm text-muted-foreground">グッズを素敵にレイアウト</p>
            </div>
          </div>

          {pagesQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              </div>
            </div>
          ) : pages.length === 0 ? (
            <Card className="p-8 md:p-12 text-center bg-white shadow-sm border-dashed border-2">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">ページがありません</h3>
                  <p className="text-sm text-muted-foreground">
                    新しいページを作成して、グッズを追加しましょう！
                  </p>
                </div>
                <Button 
                  onClick={() => navigate(`/binder/create?binderId=${binderId}`)} 
                  className="gap-2 shadow-sm hover:shadow-md transition-all mt-4"
                >
                  <Plus className="w-4 h-4" />
                  最初のページを作成
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
              {pages.map((page) => (
                <Card
                  key={page.id}
                  className="overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 hover:border-primary/20"
                >
                  <div
                    className="aspect-[3/4] sm:aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50"
                    style={{
                      backgroundColor: page.background_color || undefined,
                      backgroundImage: page.background_image
                        ? `url(${page.background_image})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={() => onSelectPage(page.id)}
                  >
                    <BinderPagePreview pageId={page.id} binderType={page.binder_type} />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/90 hover:bg-white backdrop-blur-sm shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPage(page.id);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8 bg-white/90 hover:bg-destructive hover:text-white backdrop-blur-sm shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(page.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                        {page.binder_type === "free_layout" ? (
                          <>
                            <BookOpen className="w-3 h-3" />
                            フリー
                          </>
                        ) : (
                          <>
                            <Grid3x3 className="w-3 h-3" />
                            ポケット
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-4 bg-white">
                    <h3 className="font-semibold text-xs sm:text-base md:text-lg truncate text-gray-900 group-hover:text-primary transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                      {new Date(page.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Button
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        onClick={() => navigate(`/binder/create?binderId=${binderId}`)}
      >
        <Plus className="w-6 h-6" />
      </Button>
      
      <Footer />
    </div>
  );
}
