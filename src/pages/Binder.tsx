import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useBinder } from "@/hooks/useBinder";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BinderEditor } from "@/components/binder/BinderEditor";
import { Navigate } from "react-router-dom";

export default function Binder() {
  const { user } = useAuth();
  const { binderPages, isLoadingPages, createPage, deletePage } = useBinder();
  const [newPageTitle, setNewPageTitle] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;
    await createPage.mutateAsync(newPageTitle);
    setNewPageTitle("");
    setIsCreateDialogOpen(false);
  };

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
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-amber-700" />
              <h1 className="text-3xl font-bold text-gray-900">マイバインダー</h1>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  新しいページ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しいバインダーページを作成</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="ページのタイトル"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleCreatePage()}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleCreatePage} disabled={!newPageTitle.trim()}>
                      作成
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                最初のページを作成
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {binderPages.map((page) => (
                <Card
                  key={page.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
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
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
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
                        className="h-8 w-8"
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
