import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { TitleSection } from "./sections/TitleSection";
import { ContentSection } from "./sections/ContentSection";
import { ItemTypeSection } from "./sections/ItemTypeSection";
import { TagsSection } from "./sections/TagsSection";

interface ImageData {
  url: string;
  title: string | null;
}

interface ItemFormData {
  imageUrl: string;
  title: string;
  description: string;
  category: string;
  content_name: string | null;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
  price: string;
  item_type: string;
}

interface MultipleItemsFormProps {
  images: ImageData[];
  onSubmit: (items: ItemFormData[]) => Promise<void>;
  onBack: () => void;
}

export function MultipleItemsForm({ images, onSubmit, onBack }: MultipleItemsFormProps) {
  const [items, setItems] = useState<ItemFormData[]>(
    images.map((img) => ({
      imageUrl: img.url,
      title: img.title || "",
      description: "",
      category: "",
      content_name: null,
      characterTag: null,
      typeTag: null,
      seriesTag: null,
      price: "",
      item_type: "official",
    }))
  );
  const [loading, setLoading] = useState(false);

  const updateItem = (index: number, field: keyof ItemFormData, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(items);
    } finally {
      setLoading(false);
    }
  };

  const allItemsValid = items.every(
    (item) => item.title.trim() !== "" && item.price.trim() !== ""
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {items.length}件のグッズを登録
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            戻る
          </Button>
          <Button onClick={handleSubmit} disabled={!allItemsValid || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                登録中...
              </>
            ) : (
              `${items.length}件を一括登録`
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pr-4">
          {items.map((item, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* 画像プレビュー */}
              <div className="relative">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img
                    src={item.imageUrl}
                    alt={item.title || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  #{index + 1}
                </div>
              </div>

              {/* フォーム */}
              <div className="p-5 space-y-5">
                {/* 基本情報セクション */}
                <div className="space-y-4 pb-4 border-b">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">基本情報</h4>
                  </div>
                  
                  <TitleSection 
                    title={item.title}
                    onChange={(e) => updateItem(index, "title", e.target.value)}
                  />
                  
                  <ContentSection 
                    contentName={item.content_name}
                    onChange={(e) => updateItem(index, "content_name", e.target.value)}
                  />
                  
                  <ItemTypeSection 
                    itemType={item.item_type}
                    onChange={(e) => updateItem(index, "item_type", e.target.value)}
                  />
                </div>

                {/* タグセクション */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">分類タグ</h4>
                  </div>
                  
                  <TagsSection 
                    characterTag={item.characterTag}
                    typeTag={item.typeTag}
                    seriesTag={item.seriesTag}
                    contentName={item.content_name}
                    onTagChange={(category, value) => {
                      updateItem(index, `${category}Tag` as keyof ItemFormData, value);
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
