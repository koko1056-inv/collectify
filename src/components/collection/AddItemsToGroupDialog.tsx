
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Search, Tag } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addItemToGroup } from "@/utils/tag/user-groups";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface AddItemsToGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function AddItemsToGroupDialog({ 
  isOpen, 
  onClose, 
  groupId
}: AddItemsToGroupDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { user } = useAuth();

  // アイテム一覧を取得
  useEffect(() => {
    if (isOpen && user?.id && groupId) {
      const fetchItems = async () => {
        setIsLoading(true);
        try {
          // このグループにまだ追加されていないアイテムを取得
          const { data, error } = await supabase
            .from("user_items")
            .select(`
              *,
              user_item_tags (
                tags (
                  id,
                  name,
                  category
                )
              )
            `)
            .eq("user_id", user.id)
            .not("id", "in", (subquery) => {
              return subquery
                .from("group_members")
                .select("user_id")
                .eq("group_id", groupId);
            });
            
          if (error) {
            console.error("Error fetching items:", error);
            return;
          }
          
          setItems(data || []);
          setFilteredItems(data || []);
          
          // 利用可能なすべてのタグを収集
          const tags = new Set<string>();
          data?.forEach(item => {
            item.user_item_tags?.forEach((tag: any) => {
              if (tag.tags?.name) {
                tags.add(tag.tags.name);
              }
            });
          });
          
          setAllTags(Array.from(tags).sort());
        } catch (error) {
          console.error("Error in fetchItems:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchItems();
    }
  }, [isOpen, user?.id, groupId]);

  // 検索フィルター
  useEffect(() => {
    let filtered = [...items];
    
    // テキスト検索フィルター
    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) => item.title?.toLowerCase().includes(lowerQuery) || 
                 item.item_name?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // タグフィルター
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => 
        selectedTags.every(tagName => 
          item.user_item_tags?.some((tag: any) => tag.tags?.name === tagName)
        )
      );
    }
    
    setFilteredItems(filtered);
  }, [searchQuery, items, selectedTags]);

  // タグ選択の切り替え
  const toggleTagSelection = (tagName: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(name => name !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  };

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
    if (!groupId || selectedItems.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      const results = await Promise.all(
        selectedItems.map((itemId) => addItemToGroup(groupId, itemId))
      );
      
      const successCount = results.filter(Boolean).length;
      
      if (successCount > 0) {
        toast.success(`${successCount}アイテムをグループに追加しました`);
        onClose();
        setSelectedItems([]);
      } else {
        toast.error("アイテムの追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding items to group:", error);
      toast.error("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ダイアログが閉じられたときにリセット
  const handleClose = () => {
    setSelectedItems([]);
    setSearchQuery("");
    setSelectedTags([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            グループにアイテムを追加
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">アイテム一覧</TabsTrigger>
            <TabsTrigger value="tags">タグから選択</TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="アイテムを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8"
              />
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <p className="text-sm text-gray-500">読み込み中...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">
                  {items.length === 0 
                    ? "追加できるアイテムがありません" 
                    : "検索条件に一致するアイテムがありません"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pr-4">
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
                          src={item.image || "/placeholder.svg"}
                          alt={item.title || "アイテム"}
                          className="w-full h-24 object-cover rounded"
                        />
                        {selectedItems.includes(item.id) && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-medium line-clamp-2">
                          {item.title || "無題"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="tags" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">タグを選択</span>
            </div>
            
            {allTags.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">利用可能なタグがありません</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTagSelection(tag)}
                    >
                      {tag}
                      {selectedTags.includes(tag) && <Check className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
                
                {selectedTags.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">選択タグに一致するアイテム</span>
                      <Badge variant="secondary" className="text-xs">
                        {filteredItems.length}件
                      </Badge>
                    </div>
                    
                    <ScrollArea className="h-[300px]">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pr-4">
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
                                src={item.image || "/placeholder.svg"}
                                alt={item.title || "アイテム"}
                                className="w-full h-24 object-cover rounded"
                              />
                              {selectedItems.includes(item.id) && (
                                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <div className="mt-2">
                              <p className="text-xs font-medium line-clamp-2">
                                {item.title || "無題"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-gray-500">
              {selectedItems.length}アイテムを選択中
            </p>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
                size="sm"
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleAddItems}
                disabled={isSubmitting || selectedItems.length === 0}
                size="sm"
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
