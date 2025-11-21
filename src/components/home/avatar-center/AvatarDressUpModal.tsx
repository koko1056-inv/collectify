import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shirt, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AvatarDressUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function AvatarDressUpModal({ isOpen, onClose, userId }: AvatarDressUpModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchUserItems();
      fetchCurrentAvatar();
    } else {
      // モーダルを閉じたときに選択状態とプロンプトをリセット
      setSelectedItems([]);
      setCustomPrompt("");
    }
  }, [isOpen]);

  const fetchCurrentAvatar = async () => {
    if (!userId) return;

    // まずギャラリーから is_current=true のアバターを取得
    const { data: galleryData } = await supabase
      .from("avatar_gallery")
      .select("image_url")
      .eq("user_id", userId)
      .eq("is_current", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (galleryData?.image_url) {
      setCurrentAvatarUrl(galleryData.image_url);
    } else {
      // ギャラリーになければプロフィールから取得
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (profileData?.avatar_url) {
        setCurrentAvatarUrl(profileData.avatar_url);
      }
    }
  };

  const fetchUserItems = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

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

    if (!currentAvatarUrl) {
      toast({
        title: "アバターが必要です",
        description: "先にアバターを生成してください",
      });
      return;
    }

    setGenerating(true);
    try {
      const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
      
      // プロンプトを構築
      const basePrompt = customPrompt.trim() 
        ? customPrompt 
        : `アバターに以下のグッズを装着してください：${selectedItemsData.map(item => item.title).join(", ")}`;
      
      const fullPrompt = `${basePrompt}\n\n提供された画像を参考に、自然で調和した見た目になるように編集してください。グッズの特徴や色、デザインを忠実に反映させてください。`;
      
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl: currentAvatarUrl,
          prompt: fullPrompt,
          itemImages: selectedItemsData.map(item => item.image)
        }
      });

      if (error) throw error;

      if (data?.editedImageUrl) {
        // ギャラリーに保存
        const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
        const { error: galleryError } = await supabase
          .from("avatar_gallery")
          .insert({
            user_id: userId,
            image_url: data.editedImageUrl,
            prompt: `グッズ着せ替え: ${selectedItemsData.map(item => item.title).join(", ")}`,
            item_ids: selectedItems,
            is_current: true
          });

        if (galleryError) {
          console.error("Error saving to gallery:", galleryError);
        }

        // 他のアバターの is_current を false に
        await supabase
          .from("avatar_gallery")
          .update({ is_current: false })
          .neq("image_url", data.editedImageUrl)
          .eq("user_id", userId);

        // 編集された画像をプロフィールに保存
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: data.editedImageUrl })
          .eq("id", userId);

        if (updateError) throw updateError;

        toast({
          title: "アバターを更新しました！",
          description: "グッズを装着したアバターが生成され、ギャラリーに保存されました",
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
          <DialogDescription>
            所持しているグッズを選択してアバターに着せ替えます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-prompt">カスタムプロンプト（オプション）</Label>
            <Textarea
              id="custom-prompt"
              placeholder="例：カジュアルな雰囲気で、Tシャツとバッグを自然に身につけているイメージ"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              空欄の場合は、選択したグッズを自動的に装着するプロンプトが使用されます
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            アバターに装着するグッズを選択してください（複数選択可、最大3つまで推奨）
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
