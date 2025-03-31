
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addItemToGroup } from "@/utils/tag/user-groups";
import { toast } from "sonner";
import { GroupInfo } from "@/utils/tag/types";

interface AddItemsToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupInfo | null;
  onItemsAdded: () => void;
}

export function AddItemsToGroupModal({ 
  isOpen, 
  onClose, 
  group,
  onItemsAdded 
}: AddItemsToGroupModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // アイテム一覧を取得
  useEffect(() => {
    if (isOpen && user?.id && group?.id) {
      const fetchItems = async () => {
        setIsLoading(true);
        try {
          // このグループにまだ追加されていないアイテムを取得
          const { data, error } = await supabase
            .from("user_items")
            .select("*")
            .eq("user_id", user.id)
            .not("id", "in", (subquery) => {
              return subquery
                .from("group_members")
                .select("user_id")
                .eq("group_id", group.id);
            });
            
          if (error) {
            console.error("Error fetching items:", error);
            return;
          }
          
          setItems(data || []);
          setFilteredItems(data || []);
        } catch (error) {
          console.error("Error in fetchItems:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchItems();
    }
  }, [isOpen, user?.id, group?.id]);

  // 検索フィルター
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(items);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = items.filter(
      (item) => item.title.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  // アイテム選択の切り替え
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // グループにアイテムを追加
  const handleAddItems = async () => {
    if (!group?.id || selectedItems.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      const results = await Promise.all(
        selectedItems.map((itemId) => addItemToGroup(group.id, itemId))
      );
      
      const successCount = results.filter(Boolean).length;
      
      if (successCount > 0) {
        toast("完了", {
          description: `${successCount}アイテムをグループに追加しました`,
        });
        onItemsAdded();
        onClose();
        setSelectedItems([]);
      } else {
        toast("エラー", {
          description: "アイテムの追加に失敗しました",
        });
      }
    } catch (error) {
      console.error("Error adding items to group:", error);
      toast("エラー", {
        description: "エラーが発生しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {group?.name || "グループ"}にアイテムを追加
          </DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <Input
            placeholder="アイテムを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <p>読み込み中...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">
              {items.length === 0 
                ? "追加できるアイテムがありません" 
                : "検索条件に一致するアイテムがありません"}
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 h-[400px]">
            <div className="grid grid-cols-2 gap-3 pr-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-md p-2 cursor-pointer transition-colors ${
                    selectedItems.includes(item.id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => toggleItemSelection(item.id)}
                >
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-32 object-cover rounded"
                    />
                    {selectedItems.includes(item.id) && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {item.type || "コレクション"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter className="mt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-gray-500">
              {selectedItems.length}アイテムを選択中
            </p>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleAddItems}
                disabled={isSubmitting || selectedItems.length === 0}
              >
                {isSubmitting ? "追加中..." : "追加する"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
