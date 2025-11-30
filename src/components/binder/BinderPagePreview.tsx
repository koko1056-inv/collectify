import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface BinderPagePreviewProps {
  pageId: string;
  binderType: string;
}

export function BinderPagePreview({ pageId, binderType }: BinderPagePreviewProps) {
  // バインダーアイテムを取得
  const { data: binderItems = [], isLoading } = useQuery({
    queryKey: ["binder-preview-items", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("binder_items")
        .select("*")
        .eq("binder_page_id", pageId)
        .order("z_index", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // アイテムの実際のデータを取得
  const { data: itemsWithData = [] } = useQuery({
    queryKey: ["binder-preview-items-data", pageId, binderItems.map(i => i.user_item_id || i.official_item_id)],
    enabled: binderItems.length > 0,
    queryFn: async () => {
      const result = [];
      
      for (const item of binderItems) {
        let itemData = null;
        
        if (item.user_item_id) {
          const { data } = await supabase
            .from("user_items")
            .select("id, image")
            .eq("id", item.user_item_id)
            .single();
          itemData = data;
        } else if (item.official_item_id) {
          const { data } = await supabase
            .from("official_items")
            .select("id, image")
            .eq("id", item.official_item_id)
            .single();
          itemData = data;
        } else if (item.custom_image_url) {
          itemData = {
            id: item.id,
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

  if (isLoading) {
    return (
      <div className="absolute inset-0 p-4 flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (itemsWithData.length === 0) {
    return null;
  }

  // カードポケット型の場合
  if (binderType === "card_pocket") {
    return (
      <div className="absolute inset-0 p-6 pl-8 grid grid-cols-3 gap-2">
        {itemsWithData.slice(0, 9).map((item) => (
          <div
            key={item.id}
            className="relative bg-white/90 rounded-sm overflow-hidden shadow-sm border border-gray-200"
          >
            {item.item_data?.image && (
              <img
                src={item.item_data.image}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // フリーレイアウトの場合
  return (
    <div className="absolute inset-0 overflow-hidden">
      {itemsWithData.slice(0, 10).map((item) => (
        <div
          key={item.id}
          className="absolute"
          style={{
            left: `${(item.position_x / 800) * 100}%`,
            top: `${(item.position_y / 1100) * 100}%`,
            width: `${(item.width / 800) * 100}%`,
            height: `${(item.height / 1100) * 100}%`,
            transform: `rotate(${item.rotation}deg)`,
          }}
        >
          {item.item_data?.image && (
            <img
              src={item.item_data.image}
              alt=""
              className="w-full h-full object-cover rounded-sm shadow-sm"
            />
          )}
        </div>
      ))}
    </div>
  );
}
