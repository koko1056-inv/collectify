import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { TagManageModal } from "@/components/tag/TagManageModal";
import { ShareModal } from "@/components/ShareModal";
import { ModalHeader } from "./ModalHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, X, Info, Users, Heart, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isUUID } from "@/utils/tag/tag-core";
import { SimpleItemTag } from "@/utils/tag/types";
import { ItemInfoTab } from "./tabs/ItemInfoTab";
import { ItemOwnersTab } from "./tabs/ItemOwnersTab";
import { ItemWishersTab } from "./tabs/ItemWishersTab";
import { ItemCommentsSection } from "@/features/comments/ItemCommentsSection";

interface ItemDetailsWrapperProps {
  itemId: string;
  itemTitle?: string;
  itemImage?: string;
  itemDescription?: string | null;
  itemLink?: string | null;
  itemArtist?: string | null;
  itemAnime?: string | null;
  onClose?: () => void;
  isModal?: boolean;
  isUserCollection?: boolean;
  setIsTagModalOpen?: (open: boolean) => void;
}

export function ItemDetailsWrapper({
  itemId,
  itemTitle,
  itemImage,
  itemLink,
  itemArtist,
  itemAnime,
  onClose,
  isModal = true,
  setIsTagModalOpen,
}: ItemDetailsWrapperProps) {
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: itemDetails, isLoading: isItemDetailsLoading } = useQuery({
    queryKey: ["official-item-details", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) return null;
      const { data, error } = await supabase
        .from("official_items")
        .select("*")
        .eq("id", itemId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isUUID(itemId),
  });

  const { data: itemTags = [] } = useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) return [];
      const { data, error } = await supabase
        .from("item_tags")
        .select(`*, tags (*)`)
        .eq("official_item_id", itemId);
      if (error) throw error;
      return (data ?? []).map((it: any) => ({
        id: it.id,
        tag_id: it.tag_id,
        tags: it.tags,
      })) as SimpleItemTag[];
    },
    enabled: isUUID(itemId),
  });

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["item-wishlist-count", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) return 0;
      const { count } = await supabase
        .from("wishlists")
        .select("*", { count: "exact", head: true })
        .eq("official_item_id", itemId);
      return count ?? 0;
    },
    enabled: isUUID(itemId),
  });

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) return 0;
      const { data } = await supabase
        .from("user_items")
        .select("user_id")
        .eq("official_item_id", itemId);
      const uniq = new Set((data ?? []).map((d) => d.user_id));
      return uniq.size;
    },
    enabled: isUUID(itemId),
  });

  const { data: commentsCount = 0 } = useQuery({
    queryKey: ["item-comments-count", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) return 0;
      const { count } = await supabase
        .from("item_comments")
        .select("*", { count: "exact", head: true })
        .eq("official_item_id", itemId);
      return count ?? 0;
    },
    enabled: isUUID(itemId),
  });

  const { data: model3dUrl } = useQuery({
    queryKey: ["item-3d-model", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) return null;
      const { data } = await supabase
        .from("user_items")
        .select("model_3d_url")
        .eq("official_item_id", itemId)
        .not("model_3d_url", "is", null)
        .limit(1)
        .maybeSingle();
      return data?.model_3d_url || null;
    },
    enabled: isUUID(itemId),
  });

  const { data: itemCreator } = useQuery({
    queryKey: ["item-creator", itemDetails?.created_by],
    queryFn: async () => {
      if (!itemDetails?.created_by) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", itemDetails.created_by)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!itemDetails?.created_by,
  });

  const handleAddToWishlist = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast({
          title: "エラー",
          description: "ウィッシュリストに追加するにはログインが必要です。",
          variant: "destructive",
        });
        return;
      }
      const { error } = await supabase
        .from("wishlists")
        .insert({ official_item_id: itemId, user_id: userId });
      if (error) throw error;
      toast({ title: "ウィッシュリストに追加しました" });
      await queryClient.invalidateQueries({ queryKey: ["item-wishlist-count", itemId] });
      await queryClient.invalidateQueries({ queryKey: ["item-wishers-tab", itemId] });
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message ?? "追加に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleAddToCollection = useCallback(() => {
    navigate(`/collection/add/${itemId}`);
  }, [itemId, navigate]);

  if (isItemDetailsLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!itemDetails) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        アイテムが見つかりませんでした
      </div>
    );
  }

  return (
    <>
      {isModal && (
        <ModalHeader onClose={onClose}>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </ModalHeader>
      )}

      <div className="px-4 sm:px-6 pt-3 pb-4">
        <h2 className="text-lg font-semibold mb-3 line-clamp-2">{itemDetails.title}</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="info" className="flex flex-col gap-0.5 py-2 text-xs">
              <Info className="h-4 w-4" />
              情報
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex flex-col gap-0.5 py-2 text-xs">
              <Users className="h-4 w-4" />
              持っている
              {ownersCount > 0 && (
                <span className="text-[10px] text-muted-foreground">({ownersCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="wishers" className="flex flex-col gap-0.5 py-2 text-xs">
              <Heart className="h-4 w-4" />
              欲しい
              {wishlistCount > 0 && (
                <span className="text-[10px] text-muted-foreground">({wishlistCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex flex-col gap-0.5 py-2 text-xs">
              <MessageSquare className="h-4 w-4" />
              コメント
              {commentsCount > 0 && (
                <span className="text-[10px] text-muted-foreground">({commentsCount})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <ItemInfoTab
              itemDetails={itemDetails}
              itemTags={itemTags}
              itemCreator={itemCreator}
              ownersCount={ownersCount}
              itemArtist={itemArtist}
              itemAnime={itemAnime}
              itemLink={itemLink}
              model3dUrl={model3dUrl}
              onAddToWishlist={handleAddToWishlist}
              onAddToCollection={handleAddToCollection}
              onShare={() => setIsShareModalOpen(true)}
            />
          </TabsContent>

          <TabsContent value="owners" className="mt-4">
            <ItemOwnersTab officialItemId={itemId} onCloseModal={onClose} />
          </TabsContent>

          <TabsContent value="wishers" className="mt-4">
            <ItemWishersTab
              officialItemId={itemId}
              itemTitle={itemDetails.title}
              onCloseModal={onClose}
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <ItemCommentsSection officialItemId={itemId} />
          </TabsContent>
        </Tabs>
      </div>

      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={() => setIsTagManageModalOpen(false)}
        itemIds={[itemId]}
        itemTitle={itemTitle}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={itemDetails?.title || itemTitle || "アイテム"}
        url={window.location.href}
        image={itemDetails?.image || itemImage || ""}
      />
    </>
  );
}
