import { useState } from "react";
import { X, Search, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useBinder } from "@/hooks/useBinder";

interface BinderItemPaletteProps {
  pageId: string;
  onClose: () => void;
  targetSlotIndex?: number | null;
}

function DraggableItemCard({ 
  item, 
  type,
  onClick 
}: { 
  item: any; 
  type: "user" | "official";
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draggable-${type}-${item.id}`,
    data: { type: "collection-item", itemType: type, item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all cursor-grab active:cursor-grabbing group"
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white text-xs font-medium truncate">{item.title}</p>
        </div>
      </div>
      <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-gray-600" />
      </div>
    </div>
  );
}

export function BinderItemPalette({ pageId, onClose, targetSlotIndex }: BinderItemPaletteProps) {
  const { user } = useAuth();
  const { addItem } = useBinder();
  const [searchQuery, setSearchQuery] = useState("");

  const handleItemClick = async (item: any, type: "user" | "official") => {
    if (targetSlotIndex !== null && targetSlotIndex !== undefined) {
      // 既存のアイテムがあるか確認
      const { data: existingItems } = await supabase
        .from("binder_items")
        .select("id")
        .eq("binder_page_id", pageId)
        .eq("z_index", targetSlotIndex);

      // 既存のアイテムがある場合は削除
      if (existingItems && existingItems.length > 0) {
        await Promise.all(
          existingItems.map(existingItem =>
            supabase.from("binder_items").delete().eq("id", existingItem.id)
          )
        );
      }

      // ポケットに直接追加
      await addItem.mutateAsync({
        binder_page_id: pageId,
        user_item_id: type === "user" ? item.id : null,
        official_item_id: type === "official" ? item.id : null,
        custom_image_url: null,
        position_x: 0,
        position_y: 0,
        width: 100,
        height: 140,
        rotation: 0,
        z_index: targetSlotIndex,
      });
      onClose();
    }
  };

  // ユーザーのコレクションアイテムを取得
  const { data: userItems = [] } = useQuery({
    queryKey: ["user-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // 公式アイテムを取得
  const { data: officialItems = [] } = useQuery({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const filteredUserItems = userItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOfficialItems = officialItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between bg-background">
        <div>
          <h3 className="font-semibold">アイテムを追加</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {targetSlotIndex !== null && targetSlotIndex !== undefined 
              ? "アイテムをタップして選択" 
              : "ドラッグ&ドロップで配置"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 border-b bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="アイテムを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="collection" className="flex-1 flex flex-col">
        <TabsList className="m-4">
          <TabsTrigger value="collection">マイコレクション</TabsTrigger>
          <TabsTrigger value="official">公式アイテム</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-3 p-4">
              {filteredUserItems.map((item) => (
                <DraggableItemCard 
                  key={item.id} 
                  item={item} 
                  type="user"
                  onClick={targetSlotIndex !== null && targetSlotIndex !== undefined 
                    ? () => handleItemClick(item, "user")
                    : undefined
                  }
                />
              ))}
              {filteredUserItems.length === 0 && (
                <div className="col-span-2 text-center text-muted-foreground py-8">
                  {searchQuery ? "アイテムが見つかりません" : "コレクションにアイテムがありません"}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="official" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-3 p-4">
              {filteredOfficialItems.map((item) => (
                <DraggableItemCard 
                  key={item.id} 
                  item={item} 
                  type="official"
                  onClick={targetSlotIndex !== null && targetSlotIndex !== undefined 
                    ? () => handleItemClick(item, "official")
                    : undefined
                  }
                />
              ))}
              {filteredOfficialItems.length === 0 && (
                <div className="col-span-2 text-center text-muted-foreground py-8">
                  {searchQuery ? "アイテムが見つかりません" : "公式アイテムがありません"}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
