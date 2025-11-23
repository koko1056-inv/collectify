import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface GoodsDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

interface UserItem {
  id: string;
  title: string;
  image: string;
}

export function GoodsDisplayModal({ isOpen, onClose, userId }: GoodsDisplayModalProps) {
  const [selectedItems, setSelectedItems] = useState<UserItem[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // ユーザーのアイテムを取得
  const { data: userItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserItem[];
    },
    enabled: isOpen && !!userId,
  });

  const handleItemToggle = (item: UserItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      }
      if (prev.length >= 5) {
        toast.error("最大5個まで選択できます");
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    setBackgroundFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (selectedItems.length === 0) {
      toast.error("グッズを選択してください");
      return;
    }

    if (!backgroundImage) {
      toast.error("背景画像をアップロードしてください");
      return;
    }

    setIsGenerating(true);

    try {
      // グッズ画像のURLを収集
      const itemImages = selectedItems.map(item => item.image);

      const prompt = `この背景画像に、選択されたグッズ（${selectedItems.map(i => i.title).join('、')}）を自然に配置して、魅力的な展示場の画像を生成してください。グッズは重ならないように配置し、全体的にバランスの取れた構図にしてください。`;

      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl: backgroundImage,
          prompt,
          itemImages
        }
      });

      if (error) throw error;

      if (data?.editedImageUrl) {
        setGeneratedImage(data.editedImageUrl);
        toast.success("グッズ展示場の画像を生成しました！");
      } else {
        throw new Error("画像の生成に失敗しました");
      }
    } catch (error) {
      console.error("Error generating display:", error);
      toast.error(error instanceof Error ? error.message : "画像の生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `goods-display-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("画像をダウンロードしました");
  };

  const handleReset = () => {
    setSelectedItems([]);
    setBackgroundImage(null);
    setBackgroundFile(null);
    setGeneratedImage(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            グッズ展示場
          </DialogTitle>
        </DialogHeader>

        {generatedImage ? (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border">
              <img 
                src={generatedImage} 
                alt="Generated display" 
                className="w-full h-auto"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                ダウンロード
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                最初から作り直す
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 背景画像アップロード */}
            <div className="space-y-2">
              <label className="text-sm font-medium">背景画像</label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {backgroundImage ? (
                  <div className="relative">
                    <img 
                      src={backgroundImage} 
                      alt="Background" 
                      className="w-full h-48 object-cover rounded"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setBackgroundImage(null);
                        setBackgroundFile(null);
                      }}
                    >
                      削除
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      クリックして背景画像をアップロード
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBackgroundUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* グッズ選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                展示するグッズを選択 ({selectedItems.length}/5)
              </label>
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                {isLoadingItems ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : userItems.length === 0 ? (
                  <p className="text-center text-muted-foreground p-8">
                    コレクションにグッズがありません
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {userItems.map((item) => {
                      const isSelected = selectedItems.some(i => i.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`relative border rounded-lg p-2 cursor-pointer transition-all ${
                            isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                          }`}
                          onClick={() => handleItemToggle(item)}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full aspect-square object-cover rounded mb-2"
                          />
                          <p className="text-xs truncate">{item.title}</p>
                          <Checkbox
                            checked={isSelected}
                            className="absolute top-2 right-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedItems.length === 0 || !backgroundImage}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  グッズ展示場を生成
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
