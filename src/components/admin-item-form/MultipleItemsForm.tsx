import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface ImageData {
  url: string;
  title: string | null;
}

interface ItemFormData {
  imageUrl: string;
  title: string;
  description: string;
  price: string;
  content_name: string;
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
      price: "",
      content_name: "",
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-4">
          {items.map((item, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="aspect-square relative overflow-hidden bg-muted">
                <img
                  src={item.imageUrl}
                  alt={item.title || `Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`title-${index}`}>
                    タイトル <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`title-${index}`}
                    value={item.title}
                    onChange={(e) => updateItem(index, "title", e.target.value)}
                    placeholder="タイトルを追加する"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>説明</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="説明を追加する"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`price-${index}`}>
                    価格 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`price-${index}`}
                    value={item.price}
                    onChange={(e) => updateItem(index, "price", e.target.value)}
                    placeholder="1,000円"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`content-${index}`}>コンテンツ名</Label>
                  <Input
                    id={`content-${index}`}
                    value={item.content_name}
                    onChange={(e) => updateItem(index, "content_name", e.target.value)}
                    placeholder="作品名・シリーズ名"
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
