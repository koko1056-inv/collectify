import { useBinder } from "@/hooks/useBinder";
import { BinderPage } from "@/types/binder";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardPocketSlot } from "./CardPocketSlot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BinderItemPalette } from "./BinderItemPalette";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CardPocketBinderProps {
  page: BinderPage;
}

export function CardPocketBinder({ page }: CardPocketBinderProps) {
  const { getBinderItems, updateItem, addItem } = useBinder();
  const itemsQuery = getBinderItems(page.id);
  const items = itemsQuery.data || [];
  const isMobile = useIsMobile();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showItemPalette, setShowItemPalette] = useState(false);

  // レイアウト設定（デフォルトは3x3のポケット）
  const cols = page.layout_config?.cols || 3;
  const rows = page.layout_config?.rows || 3;
  const totalPockets = cols * rows;

  // モバイルとデスクトップで異なるサイズ
  const binderWidth = isMobile ? "100%" : "800px";
  const binderHeight = isMobile ? "auto" : "1100px";
  const binderMaxWidth = isMobile ? "calc(100vw - 16px)" : "800px";

  // 各アイテムの実際のデータを取得
  const { data: itemsWithData = [] } = useQuery({
    queryKey: ["binder-items-data", page.id, items.map(i => i.user_item_id || i.official_item_id)],
    enabled: items.length > 0,
    queryFn: async () => {
      const result = [];
      
      for (const item of items) {
        let itemData = null;
        
        if (item.user_item_id) {
          const { data } = await supabase
            .from("user_items")
            .select("id, title, image")
            .eq("id", item.user_item_id)
            .single();
          itemData = data;
        } else if (item.official_item_id) {
          const { data } = await supabase
            .from("official_items")
            .select("id, title, image")
            .eq("id", item.official_item_id)
            .single();
          itemData = data;
        } else if (item.custom_image_url) {
          itemData = {
            id: item.id,
            title: "カスタム画像",
            image: item.custom_image_url,
          };
        }
        
        if (itemData) {
          result.push({
            ...item,
            item_data: itemData,
          });
        }
      }
      
      return result;
    },
  });

  // ポケット位置にアイテムを配置
  const pockets = Array.from({ length: totalPockets }, (_, index) => {
    const item = itemsWithData.find(i => i.z_index === index);
    return { index, item };
  });

  const handleEmptySlotClick = (index: number) => {
    setSelectedSlotIndex(index);
    setShowItemPalette(true);
  };

  const handleItemPaletteClose = () => {
    setShowItemPalette(false);
    setSelectedSlotIndex(null);
  };

  return (
    <>
      <div
        className="relative bg-white shadow-2xl rounded-lg overflow-hidden mx-auto"
        style={{
          width: binderWidth,
          maxWidth: binderMaxWidth,
          minHeight: binderHeight,
          backgroundColor: page.background_color || "#ffffff",
          backgroundImage: page.background_image ? `url(${page.background_image})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
      {/* バインダーの穴（左側） */}
      <div className={`absolute ${isMobile ? "left-2" : "left-4"} top-0 bottom-0 flex flex-col justify-around ${isMobile ? "py-4" : "py-12"}`}>
        {[...Array(isMobile ? 4 : 6)].map((_, i) => (
          <div
            key={i}
            className={`${isMobile ? "w-5 h-5 border-2" : "w-8 h-8 border-4"} rounded-full bg-gray-300 border-gray-400 shadow-inner`}
          />
        ))}
      </div>

        {/* カードポケットグリッド */}
        <div className={`${isMobile ? "pl-10 pr-2 py-4" : "pl-20 pr-8 py-12"} h-full`}>
          <div
            className={`grid ${isMobile ? "gap-2" : "gap-4"} h-full`}
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              minHeight: isMobile ? `${rows * 180}px` : "auto",
            }}
          >
            {pockets.map(({ index, item }) => (
              <CardPocketSlot
                key={index}
                id={page.id}
                index={index}
                item={item}
                onEmptySlotClick={handleEmptySlotClick}
              />
            ))}
          </div>
        </div>

      {/* ページタイプ表示 */}
      <div className={`absolute ${isMobile ? "top-2 right-2 px-2 py-0.5" : "top-4 right-4 px-3 py-1"} bg-white/90 rounded-full text-xs font-medium`}>
        カードポケット型 ({cols}×{rows})
      </div>
    </div>

    {/* アイテム選択シート（モバイル） */}
    <Sheet open={showItemPalette} onOpenChange={handleItemPaletteClose}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold">
            {selectedSlotIndex !== null && `ポケット ${selectedSlotIndex + 1} にアイテムを追加`}
          </h3>
        </div>
        <ScrollArea className="h-[calc(80vh-80px)]">
          <BinderItemPalette 
            pageId={page.id} 
            onClose={handleItemPaletteClose}
            targetSlotIndex={selectedSlotIndex}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  </>
  );
}
