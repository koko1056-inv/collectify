import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useBinder } from "@/hooks/useBinder";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Pencil, Trash2, Grid3x3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BinderEditor } from "@/components/binder/BinderEditor";
import { BinderPagePreview } from "@/components/binder/BinderPagePreview";
import { Navigate, useNavigate } from "react-router-dom";

export default function Binder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { binderPages, isLoadingPages, deletePage } = useBinder();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleDeletePage = async (id: string) => {
    if (confirm("このバインダーページを削除しますか?")) {
      await deletePage.mutateAsync(id);
    }
  };

  if (selectedPageId) {
    return (
      <BinderEditor
        pageId={selectedPageId}
        onClose={() => {
          setSelectedPageId(null);
          setIsPreviewMode(false);
        }}
        isPreviewMode={isPreviewMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className="container mx-auto pt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 md:gap-3 bg-white p-4 rounded-lg shadow-sm">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">マイバインダー</h1>
              <p className="text-xs md:text-sm text-muted-foreground">グッズを素敵にレイアウト</p>
            </div>
          </div>

          {isLoadingPages ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              </div>
            </div>
          ) : binderPages.length === 0 ? (
            <Card className="p-8 md:p-12 text-center bg-white shadow-sm border-dashed border-2">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">バインダーページがありません</h3>
                  <p className="text-sm text-muted-foreground">
                    新しいバインダーページを作成して、グッズを素敵にレイアウトしましょう！
                  </p>
                </div>
                <Button onClick={() => navigate("/binder/create")} className="gap-2 shadow-sm hover:shadow-md transition-all mt-4">
                  <Plus className="w-4 h-4" />
                  最初のページを作成
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
              {binderPages.map((page) => (
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
                    onClick={() => {
                      setSelectedPageId(page.id);
                      setIsPreviewMode(true);
                    }}
                  >
                    {/* バインダーアイテムのプレビュー */}
                    <BinderPagePreview pageId={page.id} binderType={page.binder_type} />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Binder ring holes decoration */}
                    <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-around py-4 z-10">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full bg-gray-400/50 border border-gray-500/30"
                        />
                      ))}
                    </div>
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/90 hover:bg-white backdrop-blur-sm shadow-lg touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPageId(page.id);
                          setIsPreviewMode(false);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8 bg-white/90 hover:bg-destructive hover:text-white backdrop-blur-sm shadow-lg touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(page.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Page type badge */}
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
      
      {/* Floating Action Button */}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        onClick={() => navigate("/binder/create")}
      >
        <Plus className="w-6 h-6" />
      </Button>
      
      <Footer />
    </div>
  );
}
