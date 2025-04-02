
import { useEffect, useState } from "react";
import { getItemsGroupedByTag, getAvailableGroups, addItemToGroup } from "@/utils/tag/tag-groups";
import { TagGroupedItems, GroupInfo } from "@/utils/tag/types";
import { CollectionGrid } from "./CollectionGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupShowcase } from "./GroupShowcase";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TagGroupedCollectionProps {
  userId?: string | null;
}

export function TagGroupedCollection({ userId }: TagGroupedCollectionProps) {
  const [groupedItems, setGroupedItems] = useState<TagGroupedItems>({});
  const [isLoading, setIsLoading] = useState(true);
  const [availableGroups, setAvailableGroups] = useState<GroupInfo[]>([]);
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    if (effectiveUserId) {
      const fetchGroupedItems = async () => {
        setIsLoading(true);
        try {
          const items = await getItemsGroupedByTag(effectiveUserId);
          setGroupedItems(items);
          
          // 利用可能なグループも取得
          const groups = await getAvailableGroups(effectiveUserId);
          setAvailableGroups(groups);
        } catch (error) {
          console.error("Error fetching grouped items:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchGroupedItems();
    }
  }, [effectiveUserId]);

  // グループにアイテムを追加する処理
  const handleAddToGroup = async (groupId: string, itemId: string) => {
    setIsAddingToGroup(true);
    try {
      const success = await addItemToGroup(groupId, itemId);
      if (success) {
        toast.success("アイテムをグループに追加しました");
      } else {
        toast.error("アイテムの追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding item to group:", error);
      toast.error("エラーが発生しました");
    } finally {
      setIsAddingToGroup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // すべてのグループを表示
  return (
    <div className="space-y-12">
      {/* グループショーケースを表示 */}
      <GroupShowcase userId={effectiveUserId} />
      
      {/* タグでグループ化された項目をアコーディオン形式で表示 */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">コレクションにはまだアイテムがありません。</p>
        </div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4">
          {Object.entries(groupedItems).map(([tagName, items]) => (
            <AccordionItem key={tagName} value={tagName} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  {tagName}
                  <span className="text-sm text-gray-500 font-normal">
                    ({items.length}点)
                  </span>
                </h2>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 bg-white">
                <CollectionGrid
                  items={items}
                  isCompact={false}
                  isSelectionMode={false}
                  selectedItems={[]}
                  onSelectItem={() => {}}
                  onDragEnd={() => {}}
                  additionalItemComponent={(item) => (
                    <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 z-10">
                      {availableGroups.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="rounded-full bg-white hover:bg-gray-100 border shadow-md"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2">
                            <div className="font-medium text-sm text-center mb-2 text-gray-700">
                              グループに追加
                            </div>
                            <div className="space-y-1">
                              {availableGroups.map((group) => (
                                <Button
                                  key={group.id}
                                  variant="ghost"
                                  className="w-full justify-start text-sm"
                                  disabled={isAddingToGroup}
                                  onClick={() => handleAddToGroup(group.id, item.id)}
                                >
                                  {group.name}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : null}
                    </div>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
