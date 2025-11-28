import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2, Upload, Plus } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ContentSection } from "./admin-item-form/sections/ContentSection";
import { ItemTypeSection } from "./admin-item-form/sections/ItemTypeSection";

interface ItemFormData {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  description: string;
  content_name: string | null;
  item_type: string;
  price: string;
}

export function BatchItemForm() {
  const [items, setItems] = useState<ItemFormData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    const newItems: ItemFormData[] = imageFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      title: "",
      description: "",
      content_name: null,
      item_type: "official",
      price: "",
    }));

    setItems(prev => [...prev, ...newItems]);
    toast.success(`${imageFiles.length}枚の画像を追加しました`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const updateItem = (id: string, updates: Partial<ItemFormData>) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSubmitAll = async () => {
    // バリデーション
    const invalidItems = items.filter(item => !item.title.trim());
    if (invalidItems.length > 0) {
      toast.error("すべてのアイテムにタイトルを入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("ログインしてください");
        return;
      }

      // 各アイテムを順番にアップロード
      for (const item of items) {
        try {
          // 画像をアップロード
          const fileExt = item.file.name.split('.').pop();
          const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('kuji_images')
            .upload(filePath, item.file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('kuji_images')
            .getPublicUrl(filePath);

          // アイテムをDBに保存
          const { error: insertError } = await supabase
            .from('official_items')
            .insert({
              title: item.title,
              description: item.description || null,
              content_name: item.content_name,
              item_type: item.item_type,
              price: item.price || "0",
              image: publicUrl,
              release_date: new Date().toISOString(),
              quantity: 1,
              created_by: user.id,
            });

          if (insertError) throw insertError;

        } catch (error) {
          console.error(`Error uploading item ${item.title}:`, error);
          toast.error(`${item.title}の追加に失敗しました`);
        }
      }

      toast.success(`${items.length}個のアイテムを追加しました！`);
      
      // クリーンアップ
      items.forEach(item => URL.revokeObjectURL(item.previewUrl));
      setItems([]);

    } catch (error) {
      console.error("Error submitting items:", error);
      toast.error("アイテムの追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ドロップゾーン */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg font-medium">ここにドロップ...</p>
        ) : (
          <>
            <p className="text-lg font-medium mb-2">
              画像をドラッグ&ドロップ
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              または、クリックしてファイルを選択
            </p>
            <Button type="button" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              画像を選択
            </Button>
          </>
        )}
      </div>

      {/* アイテムリスト */}
      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              追加するアイテム ({items.length}個)
            </h3>
            <Button
              onClick={handleSubmitAll}
              disabled={isSubmitting || items.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "すべて保存"
              )}
            </Button>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {items.map((item, index) => (
                <Card key={item.id} className="p-6">
                  <div className="flex gap-6">
                    {/* 左側：画像プレビュー */}
                    <div className="flex-shrink-0">
                      <div className="relative w-48 h-48">
                        <img
                          src={item.previewUrl}
                          alt={item.title || `Item ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 left-2 h-8 w-8"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {item.file.name}
                      </p>
                    </div>

                    {/* 右側：フォーム */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`title-${item.id}`}>
                          タイトル<span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`title-${item.id}`}
                          value={item.title}
                          onChange={(e) =>
                            updateItem(item.id, { title: e.target.value })
                          }
                          placeholder="タイトルを追加する"
                          className="text-base"
                        />
                      </div>

                      <ContentSection
                        contentName={item.content_name}
                        onChange={(e) =>
                          updateItem(item.id, { content_name: e.target.value })
                        }
                      />

                      <div className="space-y-2">
                        <Label htmlFor={`description-${item.id}`}>
                          説明文
                        </Label>
                        <Textarea
                          id={`description-${item.id}`}
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, { description: e.target.value })
                          }
                          placeholder="ピンの説明文を追加する"
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      <ItemTypeSection
                        itemType={item.item_type}
                        onChange={(e) =>
                          updateItem(item.id, { item_type: e.target.value })
                        }
                      />

                      <div className="space-y-2">
                        <Label htmlFor={`price-${item.id}`}>価格</Label>
                        <Input
                          id={`price-${item.id}`}
                          value={item.price}
                          onChange={(e) =>
                            updateItem(item.id, { price: e.target.value })
                          }
                          placeholder="例: 1,000円"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
