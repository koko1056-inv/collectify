import { useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBinder } from "@/hooks/useBinder";

interface BinderItemPaletteProps {
  pageId: string;
  onClose: () => void;
}

export function BinderItemPalette({ pageId, onClose }: BinderItemPaletteProps) {
  const { user } = useAuth();
  const { addItem } = useBinder();
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleAddUserItem = async (itemId: string) => {
    await addItem.mutateAsync({
      binder_page_id: pageId,
      user_item_id: itemId,
      official_item_id: null,
      custom_image_url: null,
      position_x: 100,
      position_y: 100,
      width: 150,
      height: 200,
      rotation: 0,
      z_index: 1,
    });
  };

  const handleAddOfficialItem = async (itemId: string) => {
    await addItem.mutateAsync({
      binder_page_id: pageId,
      user_item_id: null,
      official_item_id: itemId,
      custom_image_url: null,
      position_x: 100,
      position_y: 100,
      width: 150,
      height: 200,
      rotation: 0,
      z_index: 1,
    });
  };

  const filteredUserItems = userItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOfficialItems = officialItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">アイテムを追加</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 border-b">
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
            <div className="grid grid-cols-2 gap-2 p-4">
              {filteredUserItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddUserItem(item.id)}
                  className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="official" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-2 p-4">
              {filteredOfficialItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddOfficialItem(item.id)}
                  className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
