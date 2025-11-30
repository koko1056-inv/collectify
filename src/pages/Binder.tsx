import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useBinder } from "@/hooks/useBinder";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BinderEditor } from "@/components/binder/BinderEditor";
import { Navigate, useNavigate } from "react-router-dom";

export default function Binder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { binderPages, isLoadingPages, deletePage } = useBinder();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

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
        onClose={() => setSelectedPageId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />
      <main className="container mx-auto pt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-amber-700" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">マイバインダー</h1>
            </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate("/binder/create")}>
            <Plus className="w-4 h-4" />
            新しいページ
          </Button>
          </div>

          {isLoadingPages ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : binderPages.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">バインダーページがありません</h3>
              <p className="text-muted-foreground mb-6">
                新しいバインダーページを作成して、グッズを素敵にレイアウトしましょう！
              </p>
              <Button onClick={() => navigate("/binder/create")} className="gap-2">
                <Plus className="w-4 h-4" />
                最初のページを作成
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {binderPages.map((page) => (
                <Card
                  key={page.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group active:scale-98"
                >
                  <div
                    className="aspect-[3/4] bg-gradient-to-br from-amber-100 to-orange-100 relative"
                    style={{
                      backgroundColor: page.background_color || undefined,
                      backgroundImage: page.background_image
                        ? `url(${page.background_image})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={() => setSelectedPageId(page.id)}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity touch-auto">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9 md:h-8 md:w-8 touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPageId(page.id);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9 md:h-8 md:w-8 touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(page.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg truncate">{page.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(page.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
