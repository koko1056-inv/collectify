import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardImage } from "./collection/CardImage";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { ItemDetailsForm } from "./item-details/ItemDetailsForm";
import { MemoriesList } from "./collection/MemoriesList";
import { TagList } from "./collection/TagList";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QuantityInput } from "./item-details/QuantityInput";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: string;
  artist?: string | null;
  anime?: string | null;
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
  artist,
  anime,
  price,
  releaseDate,
  description,
  itemId,
  isUserItem = false,
  quantity = 1,
}: ItemDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    title,
    artist: artist || "",
    anime: anime || "",
    price: price || "",
    releaseDate: releaseDate || "",
    description: description || "",
    quantity,
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

  const handleSave = async () => {
    if (!editedData.title) {
      toast({
        title: "エラー",
        description: "タイトルは必須です",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const table = isUserItem ? "user_items" : "official_items";
      const { error } = await supabase
        .from(table)
        .update({
          title: editedData.title,
          artist: editedData.artist || null,
          anime: editedData.anime || null,
          [isUserItem ? "prize" : "price"]: editedData.price || null,
          release_date: editedData.releaseDate || null,
          description: editedData.description || null,
          ...(isUserItem && { quantity: editedData.quantity }),
        })
        .eq("id", itemId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      await queryClient.invalidateQueries({ queryKey: ["official-items"] });

      toast({
        title: "更新完了",
        description: "アイテム情報を更新しました",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "エラー",
        description: "アイテム情報の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      title,
      artist: artist || "",
      anime: anime || "",
      price: price || "",
      releaseDate: releaseDate || "",
      description: description || "",
      quantity,
    });
    setIsEditing(false);
  };

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
