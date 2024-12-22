import { Card, CardContent as UICardContent, CardFooter, CardHeader as UICardHeader } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader } from "./collection/CardHeader";
import { CardContent } from "./collection/CardContent";
import { CardActions } from "./collection/CardActions";
import { useAuth } from "@/contexts/AuthContext";
import { CardModals } from "./collection/CardModals";
import { useCardEventHandlers } from "./collection/CardEventHandlers";
import { Badge } from "./ui/badge";

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
  quantity?: number;
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
  prize,
  quantity = 1
}: CollectionGoodsCardProps) {
  const { user } = useAuth();
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const isOwner = !userId || (user && user.id === userId);
  const { handleDelete, handleShareToggle } = useCardEventHandlers(id);

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

  return (
    <>
      <Card 
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        {quantity > 1 && (
          <Badge 
            className="absolute top-2 right-2 z-10 bg-purple-500 hover:bg-purple-500"
          >
            ×{quantity}
          </Badge>
        )}
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
            onMemoriesClick={() => setIsMemoriesModalOpen(true)}
            onShareToggle={handleShareToggle}
          />
        </UICardContent>
        {isOwner && (
          <CardFooter className="px-2 py-1.5">
            <CardActions
              onMemoriesClick={() => setIsMemoriesModalOpen(true)}
              onTagManageClick={() => setIsTagManageModalOpen(true)}
              onShareClick={() => setIsShareModalOpen(true)}
              onDeleteClick={() => setIsDeleteDialogOpen(true)}
              hasMemories={itemMemories.length > 0}
              hasTags={itemTags.length > 0}
            />
          </CardFooter>
        )}
      </Card>

      <CardModals
        isMemoriesModalOpen={isMemoriesModalOpen}
        isTagManageModalOpen={isTagManageModalOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isShareModalOpen={isShareModalOpen}
        isDetailsModalOpen={isDetailsModalOpen}
        onMemoriesClose={() => setIsMemoriesModalOpen(false)}
        onTagManageClose={() => setIsTagManageModalOpen(false)}
        onDeleteClose={setIsDeleteDialogOpen}
        onShareClose={() => setIsShareModalOpen(false)}
        onDetailsClose={() => setIsDetailsModalOpen(false)}
        onDeleteConfirm={handleDelete}
        itemId={id}
        itemTitle={title}
        userId={userId}
        image={image}
        artist={artist}
        anime={anime}
        releaseDate={releaseDate}
        prize={prize}
      />
    </>
  );
}