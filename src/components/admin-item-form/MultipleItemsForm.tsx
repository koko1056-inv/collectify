import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2 } from "lucide-react";
import { TitleSection } from "./sections/TitleSection";
import { ContentSection } from "./sections/ContentSection";
import { ItemTypeSection } from "./sections/ItemTypeSection";
import { TagsSection } from "./sections/TagsSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  characterTagId?: string | null;
  typeTagId?: string | null;
  seriesTagId?: string | null;
  price: string;
  item_type: string;
}

interface MultipleItemsFormProps {
  images: ImageData[];
  onSubmit: (items: ItemFormData[]) => Promise<void>;
  onBack: () => void;
}

export function MultipleItemsForm({ images, onSubmit, onBack }: MultipleItemsFormProps) {
  const { t } = useLanguage();
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
      characterTagId: null,
      typeTagId: null,
      seriesTagId: null,
      price: "",
      item_type: "official",
    }))
  );
  const [loading, setLoading] = useState(false);
  const [bulkContent, setBulkContent] = useState<string>("");
  const [bulkItemType, setBulkItemType] = useState<string>("official");

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const applyToAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        content_name: bulkContent || item.content_name,
        item_type: bulkItemType || item.item_type,
      }))
    );
  };

  const updateItem = (index: number, field: keyof ItemFormData, value: string | null) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const updateItemWithTagId = (index: number, category: string, tagName: string | null, tagId: string | null) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [`${category}Tag`]: tagName,
          [`${category}TagId`]: tagId,
        };
      })
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
    (item) => item.title.trim() !== ""
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {items.length}{t("addItem.registerItems")}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            {t("addItem.back")}
          </Button>
          <Button onClick={handleSubmit} disabled={!allItemsValid || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("addItem.registering")}
              </>
            ) : (
              `${items.length}${t("addItem.bulkRegister")}`
            )}
          </Button>
        </div>
      </div>

      {/* 一括設定セクション */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">一括設定（全{items.length}件に適用）</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">コンテンツ</Label>
            <Select value={bulkContent || "none"} onValueChange={(v) => setBulkContent(v === "none" ? "" : v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="コンテンツを選択" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-60">
                <SelectItem value="none">選択なし</SelectItem>
                {contentNames.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">商品タイプ</Label>
            <Select value={bulkItemType} onValueChange={setBulkItemType}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="official">公式グッズ</SelectItem>
                <SelectItem value="original">オリジナルグッズ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={applyToAll} variant="secondary" className="w-full">
            全件に適用
          </Button>
        </div>
      </Card>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pr-4">
          {items.map((item, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
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

              <div className="p-5 space-y-5">
                <div className="space-y-4 pb-4 border-b">
                  <div className="mb-3">
                    <h4 className="text-base font-semibold text-foreground">{t("addItem.basicInfo")}</h4>
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

                <div className="space-y-4">
                  <div className="mb-3">
                    <h4 className="text-base font-semibold text-foreground">{t("addItem.categoryTags")}</h4>
                  </div>
                  
                  <TagsSection 
                    characterTag={item.characterTag}
                    typeTag={item.typeTag}
                    seriesTag={item.seriesTag}
                    contentName={item.content_name}
                    onTagChange={(category, value, tagId) => {
                      updateItemWithTagId(index, category, value, tagId || null);
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
