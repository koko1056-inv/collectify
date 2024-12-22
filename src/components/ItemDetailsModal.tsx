import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardImage } from "./collection/CardImage";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { ItemDetailsForm } from "./item-details/ItemDetailsForm";
import { MemoriesList } from "./collection/MemoriesList";
import { TagList } from "./collection/TagList";
import { useQuery } from "@tanstack/react-query";
import { QuantityInput } from "./item-details/QuantityInput";
import { useItemDetailsForm } from "./item-details/useItemDetailsForm";
import { supabase } from "@/integrations/supabase/client";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  itemId: string;
  isUserItem?: boolean;
  quantity?: number;
}

export function ItemDetailsModal({
  isOpen,
  onClose,
  title,
  image,
  price,
  releaseDate = new Date().toISOString().split('T')[0],
  description,
  itemId,
  isUserItem = false,
  quantity = 1,
}: ItemDetailsModalProps) {
  const {
    isEditing,
    isSaving,
    editedData,
    setIsEditing,
    setEditedData,
    handleSave,
    handleCancel,
  } = useItemDetailsForm({
    title,
    price,
    releaseDate,
    description,
    quantity,
    itemId,
    isUserItem,
    onEditComplete: () => setIsEditing(false),
  });

  const { data: memories = [] } = useQuery({
    queryKey: ["item-memories", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isUserItem,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["user-item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq("user_item_id", itemId);
      if (error) throw error;
      return data;
    },
    enabled: isUserItem,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col">
        <DialogHeader>
          {isEditing ? (
            <Input
              value={editedData.title}
              onChange={(e) =>
                setEditedData({ ...editedData, title: e.target.value })
              }
              className="text-xl font-bold"
              placeholder="タイトルを入力"
              required
            />
          ) : (
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4">
            <div className="w-full aspect-square relative">
              <CardImage image={image} title={title} />
            </div>

            {isUserItem && tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">タグ</h3>
                <TagList tags={tags} />
              </div>
            )}

            <div className="space-y-2">
              {isUserItem && (
                <QuantityInput
                  isEditing={isEditing}
                  quantity={editedData.quantity}
                  onChange={(value) => setEditedData({ ...editedData, quantity: value })}
                />
              )}
              <ItemDetailsForm
                isEditing={isEditing}
                editedData={editedData}
                setEditedData={setEditedData}
                isUserItem={isUserItem}
              />
            </div>

            {isUserItem && memories.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">思い出</h3>
                <MemoriesList memories={memories} />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>編集</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}