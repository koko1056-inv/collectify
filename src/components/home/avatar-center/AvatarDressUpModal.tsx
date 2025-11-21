import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shirt, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface AvatarDressUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  avatarUrl: string | null;
}

export function AvatarDressUpModal({ isOpen, onClose, userId, avatarUrl }: AvatarDressUpModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchUserItems();
    }
  }, [isOpen]);

  const fetchUserItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アイテムの取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleGenerate = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "アイテムを選択してください",
        description: "少なくとも1つのグッズを選択してください",
      });
      return;
    }

    if (!avatarUrl) {
      toast({
        title: "アバターが必要です",
        description: "先にアバターを生成してください",
      });
      return;
    }

    setGenerating(true);
    try {
      const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
      
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl: avatarUrl,
          prompt: `アバターに以下のグッズを装着してください：${selectedItemsData.map(item => item.title).join(", ")}。自然で調和した見た目になるようにしてください。`,
          itemImages: selectedItemsData.map(item => item.image)
        }
      });

      if (error) throw error;

      if (data?.editedImageUrl) {
        // 編集された画像をプロフィールに保存
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: data.editedImageUrl })
          .eq("id", userId);

        if (updateError) throw updateError;

        toast({
          title: "アバターを更新しました！",
          description: "グッズを装着したアバターが生成されました",
        });
        
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error("Error generating avatar:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの生成に失敗しました",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shirt className="w-5 h-5" />
            グッズ着せ替え
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            アバターに装着するグッズを選択してください（複数選択可）
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">グッズが見つかりませんでした</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedItems.includes(item.id)
                        ? "border-primary shadow-lg scale-95"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 right-2">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        className="bg-background"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white truncate">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || selectedItems.length === 0}
                  className="flex-1"
                >
                  {generating ? (
                    <>生成中...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      アバターを生成
                    </>
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {selectedItems.length > 0 && (
                <p className="text-sm text-center text-muted-foreground">
                  {selectedItems.length}個のグッズを選択中
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
