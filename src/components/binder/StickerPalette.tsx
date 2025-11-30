import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBinder } from "@/hooks/useBinder";
import { StickerPreset } from "@/types/binder";

interface StickerPaletteProps {
  pageId: string;
}

export function StickerPalette({ pageId }: StickerPaletteProps) {
  const { addDecoration } = useBinder();

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
      position_x: 100,
      position_y: 100,
      width: 60,
      height: 60,
      rotation: 0,
      z_index: 100,
      style_config: { color: "#FF6B9D" },
    });
  };

  const categories = [...new Set(stickers.map((s) => s.category))];

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">ステッカー</h3>
      <Tabs defaultValue={categories[0] || "all"}>
        <TabsList className="w-full">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="flex-1">
              {cat === "shape" && "図形"}
              {cat === "emoji" && "絵文字"}
              {cat === "decoration" && "装飾"}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-4 gap-2">
                {stickers
                  .filter((s) => s.category === cat)
                  .map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleAddSticker(sticker)}
                      className="aspect-square rounded-lg border-2 border-transparent hover:border-primary transition-colors p-2 bg-gray-50 hover:bg-gray-100"
                      title={sticker.name}
                    >
                      {sticker.svg_data ? (
                        <div
                          className="w-full h-full"
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
      </Tabs>
    </div>
  );
}
