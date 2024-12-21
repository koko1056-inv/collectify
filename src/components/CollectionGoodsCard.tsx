import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ItemMemoriesModal } from "./ItemMemoriesModal";
import { TagManageModal } from "./tag/TagManageModal";
import { ShareModal } from "./ShareModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardImage } from "./collection/CardImage";
import { TagList } from "./collection/TagList";
import { CardActions } from "./collection/CardActions";
import { DeleteConfirmDialog } from "./collection/DeleteConfirmDialog";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { LikeButton } from "./collection/LikeButton";

interface CollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
  isShared?: boolean;
  userId?: string;
}

export function CollectionGoodsCard({ title, image, id, isShared = false, userId }: CollectionGoodsCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const isOwner = !userId || (user && user.id === userId);

  const { data: itemTags = [] } = useQuery({
    queryKey: ["user-item-tags", id],
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
        .eq("user_item_id", id);
      if (error) throw error;
      return data;
    },
  });

  const { data: itemMemories = [] } = useQuery({
    queryKey: ["item-memories", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", id);
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("user_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: "削除完了",
        description: "アイテムをコレクションから削除しました。",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "エラー",
        description: "アイテムの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleShareToggle = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("user_items")
        .update({ is_shared: checked })
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: checked ? "共有設定完了" : "非公開設定完了",
        description: checked ? "アイテムを共有しました。" : "アイテムを非公開にしました。",
      });
    } catch (error) {
      console.error("Error updating share status:", error);
      toast({
        title: "エラー",
        description: "共有設定の更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const hasTags = itemTags.length > 0;
  const hasMemories = itemMemories.length > 0;

  return (
    <>
      <Card className="hover-scale card-shadow bg-white border border-gray-200">
        <CardHeader className="p-0">
          <CardImage image={image} title={title} />
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
          <TagList tags={itemTags} />
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMemoriesModalOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              思い出を見る ({itemMemories.length})
            </Button>
            <LikeButton itemId={id} />
          </div>
          {isOwner && (
            <div className="flex items-center justify-between mt-4 space-x-2">
              <Label htmlFor={`share-toggle-${id}`} className="text-sm text-gray-600">
                {isShared ? "共有中" : "非公開"}
              </Label>
              <Switch
                id={`share-toggle-${id}`}
                checked={isShared}
                onCheckedChange={handleShareToggle}
              />
            </div>
          )}
        </CardContent>
        {isOwner && (
          <CardFooter className="p-4 pt-0">
            <CardActions
              onMemoriesClick={() => setIsMemoriesModalOpen(true)}
              onTagManageClick={() => setIsTagManageModalOpen(true)}
              onShareClick={() => setIsShareModalOpen(true)}
              onDeleteClick={() => setIsDeleteDialogOpen(true)}
              hasMemories={hasMemories}
              hasTags={hasTags}
            />
          </CardFooter>
        )}
      </Card>

      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={() => setIsMemoriesModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />

      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={() => setIsTagManageModalOpen(false)}
        itemId={id}
        itemTitle={title}
        isUserItem={true}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={title}
        url={window.location.href}
        image={image}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </>
  );
}