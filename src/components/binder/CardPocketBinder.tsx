import { useBinder } from "@/hooks/useBinder";
import { BinderPage } from "@/types/binder";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CardPocketBinderProps {
  page: BinderPage;
}

export function CardPocketBinder({ page }: CardPocketBinderProps) {
  const { getBinderItems } = useBinder();
  const itemsQuery = getBinderItems(page.id);
  const items = itemsQuery.data || [];

  // レイアウト設定（デフォルトは3x3のポケット）
  const cols = page.layout_config?.cols || 3;
  const rows = page.layout_config?.rows || 3;
  const totalPockets = cols * rows;

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

  return (
    <div
      className="relative bg-white shadow-2xl rounded-lg overflow-hidden"
      style={{
        width: "800px",
        height: "1100px",
        backgroundColor: page.background_color || "#ffffff",
        backgroundImage: page.background_image ? `url(${page.background_image})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* バインダーの穴（左側） */}
      <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-12">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full bg-gray-300 border-4 border-gray-400 shadow-inner"
          />
        ))}
      </div>

      {/* カードポケットグリッド */}
      <div className="pl-20 pr-8 py-12 h-full">
        <div
          className="grid gap-4 h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {pockets.map(({ index, item }) => (
            <div
              key={index}
              className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300 shadow-inner overflow-hidden"
            >
              {/* ポケットの反射効果 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
              
              {/* アイテム */}
              {item?.item_data ? (
                <div className="w-full h-full p-2">
                  <img
                    src={item.item_data.image}
                    alt={item.item_data.title}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  空
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ページタイプ表示 */}
      <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-medium">
        カードポケット型 ({cols}×{rows})
      </div>
    </div>
  );
}
