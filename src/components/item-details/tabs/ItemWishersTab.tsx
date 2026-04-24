import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, HeartOff, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { TrustBadge } from "@/features/trust/TrustBadge";
import { StampSendButton } from "@/features/stamps/StampSendButton";
import { useTrustScoresBulk } from "@/features/trust/useTrustScore";

interface ItemWishersTabProps {
  officialItemId: string;
  itemTitle: string;
  onCloseModal?: () => void;
}

/**
 * 「欲しい人」タブの内容（モーダル内に直接埋め込む版）。
 * 自分の追加/解除トグルもここに配置。
 */
export function ItemWishersTab({
  officialItemId,
  itemTitle,
  onCloseModal,
}: ItemWishersTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { playWishlistSound } = useSoundEffect();

  const { data: wishers = [], isLoading } = useQuery({
    queryKey: ["item-wishers-tab", officialItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, user_id, created_at")
        .eq("official_item_id", officialItemId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map((d) => d.user_id);
      if (!ids.length) return [];

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((w) => ({ ...w, profile: map.get(w.user_id) }));
    },
    enabled: !!officialItemId,
  });

  const { data: isInWishlist } = useQuery({
    queryKey: ["is-in-wishlist", officialItemId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("official_item_id", officialItemId)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const toggleMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("ログインが必要です");
      if (isInWishlist) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("official_item_id", officialItemId)
          .eq("user_id", user.id);
        if (error) throw error;
        return { added: false };
      }
      const { error } = await supabase
        .from("wishlists")
        .insert({ official_item_id: officialItemId, user_id: user.id });
      if (error) throw error;
      return { added: true };
    },
    onSuccess: (r) => {
      if (r.added) playWishlistSound();
      qc.invalidateQueries({ queryKey: ["is-in-wishlist", officialItemId, user?.id] });
      qc.invalidateQueries({ queryKey: ["item-wishers-tab", officialItemId] });
      qc.invalidateQueries({ queryKey: ["item-wishlist-count", officialItemId] });
      toast({
        title: r.added ? "ウィッシュリストに追加" : "ウィッシュリストから削除",
        description: itemTitle,
      });
    },
    onError: (e: any) => {
      toast({ title: "エラー", description: e?.message, variant: "destructive" });
    },
  });

  const otherIds = wishers.map((w) => w.user_id).filter((id) => id !== user?.id);
  const { data: trustMap } = useTrustScoresBulk(otherIds);

  return (
    <div className="space-y-3">
      {user && (
        <Button
          onClick={() => toggleMut.mutate()}
          disabled={toggleMut.isPending}
          variant={isInWishlist ? "outline" : "default"}
          className="w-full gap-2"
        >
          {isInWishlist ? (
            <>
              <HeartOff className="h-4 w-4" />
              ウィッシュリストから削除
            </>
          ) : (
            <>
              <Heart className="h-4 w-4" />
              ウィッシュリストに追加
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-muted-foreground px-1">
        {wishers.length}人がほしいリストに追加
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : wishers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Heart className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">まだ誰もほしいリストに追加していません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {wishers.map((w: any) => {
            const isMe = w.user_id === user?.id;
            const score = trustMap?.[w.user_id];
            return (
              <div
                key={w.id}
                className="flex flex-col gap-2 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/user/${w.profile?.username || w.user_id}`}
                    onClick={onCloseModal}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={w.profile?.avatar_url || ""} />
                      <AvatarFallback>
                        <UserRound className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {w.profile?.display_name || w.profile?.username || "ユーザー"}
                          {isMe && <span className="text-primary ml-1">(あなた)</span>}
                        </p>
                        {!isMe && score && (
                          <TrustBadge score={score} size="xs" showLabel={false} />
                        )}
                      </div>
                      {w.profile?.bio && (
                        <p className="text-xs text-muted-foreground truncate">
                          {w.profile.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
                {!isMe && user && (
                  <div className="flex justify-end">
                    <StampSendButton
                      receiverId={w.user_id}
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
      )}
    </div>
  );
}
