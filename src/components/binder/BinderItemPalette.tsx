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
  onClick,
  isSelected,
  onConfirm
}: { 
  item: any; 
  type: "user" | "official";
  onClick?: () => void;
  isSelected?: boolean;
  onConfirm?: () => void;
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
      className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
        isSelected ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-primary"
      } ${onClick ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
      onClick={handleClick}
      {...(!onClick ? listeners : {})}
      {...(!onClick ? attributes : {})}
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
      {!isSelected && (
        <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>
      )}
      {isSelected && onConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            size="sm"
            className="shadow-lg"
          >
            反映
          </Button>
        </div>
      )}
    </div>
  );
}

export function BinderItemPalette({ pageId, onClose, targetSlotIndex }: BinderItemPaletteProps) {
  const { user } = useAuth();
  const { addItem } = useBinder();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ item: any; type: "user" | "official" } | null>(null);

  const handleItemClick = (item: any, type: "user" | "official") => {
    setSelectedItem({ item, type });
  };

  const handleConfirm = async () => {
    if (!selectedItem) return;

    if (targetSlotIndex !== null && targetSlotIndex !== undefined) {
      // カードポケットモード：指定されたスロットに配置
      const { data: existingItems } = await supabase
        .from("binder_items")
        .select("id")
        .eq("binder_page_id", pageId)
        .eq("z_index", targetSlotIndex);

      if (existingItems && existingItems.length > 0) {
        await Promise.all(
          existingItems.map(existingItem =>
            supabase.from("binder_items").delete().eq("id", existingItem.id)
          )
        );
      }

      await addItem.mutateAsync({
        binder_page_id: pageId,
        user_item_id: selectedItem.type === "user" ? selectedItem.item.id : null,
        official_item_id: selectedItem.type === "official" ? selectedItem.item.id : null,
        custom_image_url: null,
        position_x: 0,
        position_y: 0,
        width: 100,
        height: 140,
        rotation: 0,
        z_index: targetSlotIndex,
      });
    } else {
      // フリーレイアウトモード：キャンバスの中央に配置
      const { data: existingItems } = await supabase
        .from("binder_items")
        .select("z_index")
        .eq("binder_page_id", pageId)
        .order("z_index", { ascending: false })
        .limit(1);

      const maxZIndex = existingItems && existingItems.length > 0 ? existingItems[0].z_index : 0;

      await addItem.mutateAsync({
        binder_page_id: pageId,
        user_item_id: selectedItem.type === "user" ? selectedItem.item.id : null,
        official_item_id: selectedItem.type === "official" ? selectedItem.item.id : null,
        custom_image_url: null,
        position_x: 150,
        position_y: 150,
        width: 200,
        height: 280,
        rotation: 0,
        z_index: maxZIndex + 1,
      });
    }
    
    setSelectedItem(null);
    onClose();
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
            アイテムをタップして選択し、反映ボタンで追加
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
                  onClick={() => handleItemClick(item, "user")}
                  isSelected={selectedItem?.item.id === item.id && selectedItem?.type === "user"}
                  onConfirm={handleConfirm}
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
                  onClick={() => handleItemClick(item, "official")}
                  isSelected={selectedItem?.item.id === item.id && selectedItem?.type === "official"}
                  onConfirm={handleConfirm}
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
