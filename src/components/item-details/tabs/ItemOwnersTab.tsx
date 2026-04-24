import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Package, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TrustBadge } from "@/features/trust/TrustBadge";
import { StampSendButton } from "@/features/stamps/StampSendButton";
import { useTrustScoresBulk } from "@/features/trust/useTrustScore";

interface ItemOwnersTabProps {
  officialItemId: string;
  onCloseModal?: () => void;
}

/**
 * 「持っている人」タブの内容（モーダル内に直接埋め込む版）。
 */
export function ItemOwnersTab({ officialItemId, onCloseModal }: ItemOwnersTabProps) {
  const { user } = useAuth();

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["item-owners-tab", officialItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(
          `id, user_id, quantity,
           profiles ( id, username, avatar_url, display_name, bio )`
        )
        .eq("official_item_id", officialItemId);

      if (error) throw error;

      const map = new Map<string, any>();
      (data ?? []).forEach((item: any) => {
        const cur = map.get(item.user_id);
        const qty = (item.quantity || 1) + (cur?.quantity || 0);
        map.set(item.user_id, {
          user_id: item.user_id,
          quantity: qty,
          profile: item.profiles,
        });
      });
      return Array.from(map.values()).sort((a, b) => {
        if (a.user_id === user?.id) return 1;
        if (b.user_id === user?.id) return -1;
        return b.quantity - a.quantity;
      });
    },
    enabled: !!officialItemId,
  });

  const ownerIds = owners.map((o) => o.user_id).filter((id) => id !== user?.id);
  const { data: trustMap } = useTrustScoresBulk(ownerIds);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (owners.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">まだ誰も登録していません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1 mb-1">
        {owners.length}人のコレクター
      </p>
      {owners.map((owner) => {
        const isMe = owner.user_id === user?.id;
        const score = trustMap?.[owner.user_id];
        return (
          <div
            key={owner.user_id}
            className="flex flex-col gap-2 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                to={`/user/${owner.profile?.username || owner.user_id}`}
                onClick={onCloseModal}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={owner.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {owner.profile?.username?.charAt(0).toUpperCase() || (
                      <UserRound className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-medium text-sm truncate">
                      {owner.profile?.display_name || owner.profile?.username || "ユーザー"}
                      {isMe && <span className="text-primary ml-1">(あなた)</span>}
                    </p>
                    {!isMe && score && (
                      <TrustBadge score={score} size="xs" showLabel={false} />
                    )}
                  </div>
                  {owner.profile?.bio && (
                    <p className="text-xs text-muted-foreground truncate">
                      {owner.profile.bio}
                    </p>
                  )}
                </div>
              </Link>
              <Badge variant="outline" className="flex-shrink-0">
                {owner.quantity}個
              </Badge>
            </div>
            {!isMe && user && (
              <div className="flex justify-end">
                <StampSendButton
                  receiverId={owner.user_id}
                  contextType="item"
                  contextId={officialItemId}
                  size="sm"
                  label="あいさつ"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
