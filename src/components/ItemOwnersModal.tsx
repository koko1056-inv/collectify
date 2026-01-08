import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Users, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ItemOwnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  itemImage: string;
  officialItemId?: string;
}

export function ItemOwnersModal({
  isOpen,
  onClose,
  itemTitle,
  itemImage,
  officialItemId,
}: ItemOwnersModalProps) {
  const { user } = useAuth();

  const { data: owners, isLoading } = useQuery({
    queryKey: ["item-owners", officialItemId || itemTitle, itemImage],
    queryFn: async () => {
      let query = supabase
        .from("user_items")
        .select(`
          id,
          user_id,
          quantity,
          profiles (
            id,
            username,
            avatar_url,
            display_name,
            bio
          )
        `);

      // official_item_idがあればそれで検索、なければtitle+imageで検索
      if (officialItemId) {
        query = query.eq("official_item_id", officialItemId);
      } else {
        query = query.eq("title", itemTitle).eq("image", itemImage);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching item owners:", error);
        return [];
      }

      // ユーザーごとのアイテム数を集計
      const userOwnership = new Map();
      data.forEach((item) => {
        const userId = item.user_id;
        const currentQuantity = userOwnership.get(userId)?.quantity || 0;
        const newQuantity = (item.quantity || 1) + currentQuantity;
        
        userOwnership.set(userId, {
          quantity: newQuantity,
          profile: item.profiles,
          user_id: userId
        });
      });

      // Mapの値を配列に変換して、自分以外を先頭に
      const result = Array.from(userOwnership.values());
      return result.sort((a, b) => {
        if (a.user_id === user?.id) return 1;
        if (b.user_id === user?.id) return -1;
        return b.quantity - a.quantity;
      });
    },
    enabled: isOpen,
  });

  const totalOwners = owners?.length || 0;
  const isUserOwner = owners?.some(o => o.user_id === user?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            このグッズを持っているユーザー
          </DialogTitle>
          <DialogDescription>
            {itemTitle}を持っている{totalOwners}人のコレクター
          </DialogDescription>
        </DialogHeader>

        {/* アイテム情報 */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <img 
            src={itemImage} 
            alt={itemTitle} 
            className="w-12 h-12 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{itemTitle}</p>
            <p className="text-xs text-muted-foreground">
              {totalOwners}人が所有
            </p>
          </div>
          {isUserOwner && (
            <Badge variant="secondary" className="text-xs">
              所有中
            </Badge>
          )}
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
          ) : owners?.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                まだ誰も持っていません
              </p>
            </div>
          ) : (
            owners?.map((owner) => (
              <Link
                key={owner.user_id}
                to={`/user/${owner.profile?.username || owner.user_id}`}
                onClick={onClose}
                className="flex items-center justify-between gap-3 hover:bg-muted p-3 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={owner.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {owner.profile?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {owner.profile?.display_name || owner.profile?.username}
                      {owner.user_id === user?.id && (
                        <span className="text-primary ml-1">(あなた)</span>
                      )}
                    </p>
                    {owner.profile?.bio && (
                      <p className="text-xs text-muted-foreground truncate">
                        {owner.profile.bio}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="flex-shrink-0">
                  {owner.quantity}個
                </Badge>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
