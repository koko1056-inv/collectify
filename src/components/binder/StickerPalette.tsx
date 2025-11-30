import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StickerPreset } from "@/types/binder";
import { useBinder } from "@/hooks/useBinder";
import { Smile, Star, Sparkles, MessageSquare, Music, ArrowRight, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CustomImageUpload } from "./CustomImageUpload";

interface StickerPaletteProps {
  pageId: string;
}

// カテゴリーアイコンマッピング
const categoryIcons: Record<string, any> = {
  "絵文字": Smile,
  "図形": Shapes,
  "矢印": ArrowRight,
  "記号": Star,
  "吹き出し": MessageSquare,
  "装飾": Sparkles,
  "音楽": Music,
};

export function StickerPalette({ pageId }: StickerPaletteProps) {
  const { addDecoration } = useBinder();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState("#FF6B9D");

  // ステッカープリセットを取得
  const { data: stickers = [] } = useQuery({
    queryKey: ["sticker-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sticker_presets")
        .select("*")
        .eq("is_public", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as StickerPreset[];
    },
  });

  // カテゴリー別にグループ化
  const stickersByCategory = useMemo(() => {
    return stickers.reduce((acc, sticker) => {
      if (!acc[sticker.category]) {
        acc[sticker.category] = [];
      }
      acc[sticker.category].push(sticker);
      return acc;
    }, {} as Record<string, StickerPreset[]>);
  }, [stickers]);

  const categories = Object.keys(stickersByCategory).sort();

  const handleAddSticker = async (sticker: StickerPreset) => {
    await addDecoration.mutateAsync({
      binder_page_id: pageId,
      decoration_type: "sticker",
      content: sticker.svg_data || sticker.image_url || "",
      position_x: 350,
      position_y: 450,
      width: 60,
      height: 60,
      rotation: 0,
      z_index: 10,
      style_config: { color: selectedColor },
    });
    
    toast({
      title: "ステッカーを追加しました",
      description: sticker.name,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 色選択 */}
      <div className="p-4 border-b bg-muted/30">
        <p className="text-sm font-medium mb-3">ステッカーの色</p>
        <div className="flex gap-2 flex-wrap">
          {["#FF6B9D", "#FFB6C1", "#FFD700", "#87CEEB", "#98FB98", "#DDA0DD", "#FF6347", "#4169E1"].map((color) => (
            <button
              key={color}
              className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                selectedColor === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-gray-300"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* カテゴリータブ */}
      <Tabs defaultValue={categories[0] || "図形"} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0 px-4 pt-2">
          {categories.map((category) => {
            const Icon = categoryIcons[category] || Star;
            return (
              <TabsTrigger key={category} value={category} className="gap-2">
                <Icon className="w-4 h-4" />
                {category}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {categories.map((category) => (
            <TabsContent key={category} value={category} className="m-0 p-4">
              <div className="grid grid-cols-4 gap-3">
                {stickersByCategory[category]?.map((sticker) => (
                  <Button
                    key={sticker.id}
                    variant="outline"
                    className="h-20 p-2 hover:bg-primary/10 hover:border-primary transition-all"
                    onClick={() => handleAddSticker(sticker)}
                    title={sticker.name}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ color: selectedColor }}
                      dangerouslySetInnerHTML={{ __html: sticker.svg_data || "" }}
                    />
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* カスタム画像アップロード */}
      <CustomImageUpload pageId={pageId} />
    </div>
  );
}
