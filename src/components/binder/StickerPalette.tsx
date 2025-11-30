import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette } from "lucide-react";
import { useBinder } from "@/hooks/useBinder";
import { StickerPreset } from "@/types/binder";
import { useToast } from "@/hooks/use-toast";

interface StickerPaletteProps {
  pageId: string;
}

export function StickerPalette({ pageId }: StickerPaletteProps) {
  const { addDecoration } = useBinder();
  const { toast } = useToast();
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [stickerColor, setStickerColor] = useState("#FF6B9D");

  const { data: stickers = [] } = useQuery<StickerPreset[]>({
    queryKey: ["sticker-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sticker_presets")
        .select("*")
        .order("category");

      if (error) throw error;
      return data as StickerPreset[];
    },
  });

  const handleAddSticker = async (sticker: StickerPreset) => {
    await addDecoration.mutateAsync({
      binder_page_id: pageId,
      decoration_type: "sticker",
      content: sticker.svg_data || sticker.image_url || "",
      position_x: 150,
      position_y: 150,
      width: 80,
      height: 80,
      rotation: 0,
      z_index: 100,
      style_config: { color: stickerColor },
    });
    
    toast({
      title: "ステッカーを追加しました",
      description: sticker.name,
    });
  };

  const handleAddCustomImage = async () => {
    if (!customImageUrl.trim()) {
      toast({
        title: "エラー",
        description: "画像URLを入力してください",
        variant: "destructive",
      });
      return;
    }

    await addDecoration.mutateAsync({
      binder_page_id: pageId,
      decoration_type: "sticker",
      content: customImageUrl,
      position_x: 150,
      position_y: 150,
      width: 100,
      height: 100,
      rotation: 0,
      z_index: 100,
      style_config: {},
    });

    toast({
      title: "カスタムステッカーを追加しました",
    });
    setCustomImageUrl("");
  };

  const categories = [...new Set(stickers.map((s) => s.category))];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-2">ステッカー</h3>
        <div className="flex items-center gap-2 mb-4">
          <Label className="text-xs">カラー:</Label>
          <Input
            type="color"
            value={stickerColor}
            onChange={(e) => setStickerColor(e.target.value)}
            className="w-16 h-8"
          />
          <span className="text-xs text-muted-foreground">SVGステッカーの色を変更</span>
        </div>
      </div>

      <Tabs defaultValue={categories[0] || "custom"} className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          {categories.slice(0, 3).map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat === "shape" && "図形"}
              {cat === "emoji" && "絵文字"}
              {cat === "decoration" && "装飾"}
            </TabsTrigger>
          ))}
          <TabsTrigger value="custom" className="text-xs">
            <Upload className="w-3 h-3 mr-1" />
            カスタム
          </TabsTrigger>
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <ScrollArea className="h-[350px]">
              <div className="grid grid-cols-4 gap-2">
                {stickers
                  .filter((s) => s.category === cat)
                  .map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleAddSticker(sticker)}
                      className="aspect-square rounded-lg border-2 border-transparent hover:border-primary transition-all p-2 bg-gray-50 hover:bg-gray-100 hover:scale-105"
                      title={sticker.name}
                    >
                      {sticker.svg_data ? (
                        <div
                          className="w-full h-full"
                          style={{ color: stickerColor }}
                          dangerouslySetInnerHTML={{ __html: sticker.svg_data }}
                        />
                      ) : sticker.image_url ? (
                        <img
                          src={sticker.image_url}
                          alt={sticker.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {sticker.name}
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}

        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-3">
            <Label>カスタム画像URL</Label>
            <Input
              type="url"
              placeholder="https://example.com/image.png"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
            />
            <Button onClick={handleAddCustomImage} className="w-full" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              画像を追加
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• 画像のURLを入力してカスタムステッカーを追加できます</p>
            <p>• PNG, JPG, GIF, SVG形式をサポート</p>
            <p>• 透過PNGがおすすめです</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
