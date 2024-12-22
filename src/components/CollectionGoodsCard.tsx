import { Card, CardContent as UICardContent, CardFooter, CardHeader as UICardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ItemMemoriesModal } from "./ItemMemoriesModal";
import { TagManageModal } from "./tag/TagManageModal";
import { ShareModal } from "./ShareModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader } from "./collection/CardHeader";
import { CardContent } from "./collection/CardContent";
import { CardActions } from "./collection/CardActions";
import { DeleteConfirmDialog } from "./collection/DeleteConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ItemDetailsModal } from "./ItemDetailsModal";

interface CollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
  isShared?: boolean;
  userId?: string;
  artist?: string | null;
  anime?: string | null;
  releaseDate?: string;
  prize?: string;
}

export function CollectionGoodsCard({ 
  title, 
  image, 
  id, 
  isShared = false, 
  userId,
  artist,
  anime,
  releaseDate,
  prize
}: CollectionGoodsCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
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

  return (
    <>
      <Card 
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        <UICardHeader className="p-0">
          <CardHeader title={title} image={image} />
        </UICardHeader>
        <UICardContent className="p-0">
          <CardContent
            itemId={id}
            itemTags={itemTags}
            memoriesCount={itemMemories.length}
            isOwner={isOwner}
            isShared={isShared}
            onMemoriesClick={(e) => {
              e.stopPropagation();
              setIsMemoriesModalOpen(true);
            }}
            onShareToggle={handleShareToggle}
          />
        </UICardContent>
        {isOwner && (
          <CardFooter className="px-2 py-1.5">
            <CardActions
              onMemoriesClick={(e) => {
                e.stopPropagation();
                setIsMemoriesModalOpen(true);
              }}
              onTagManageClick={(e) => {
                e.stopPropagation();
                setIsTagManageModalOpen(true);
              }}
              onShareClick={(e) => {
                e.stopPropagation();
                setIsShareModalOpen(true);
              }}
              onDeleteClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
              }}
              hasMemories={itemMemories.length > 0}
              hasTags={itemTags.length > 0}
            />
          </CardFooter>
        )}
      </Card>

      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={title}
        image={image}
        artist={artist}
        anime={anime}
        price={prize}
        releaseDate={releaseDate}
      />

      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={() => setIsMemoriesModalOpen(false)}
        itemId={id}
        itemTitle={title}
        userId={userId}
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