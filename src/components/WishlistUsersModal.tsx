import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserRound, Heart, HeartOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffect } from "@/hooks/useSoundEffect";

interface WishlistUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

export function WishlistUsersModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
}: WishlistUsersModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { playWishlistSound } = useSoundEffect();

  const { data: wishlistUsers = [], isLoading } = useQuery({
    queryKey: ["wishlist-users", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq("official_item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching wishlist users:", error);
        throw error;
      }

      // プロフィール情報を別途取得
      const userIds = data.map(item => item.user_id);
      
      if (userIds.length === 0) {
        return [];
      }
      
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        throw profileError;
      }

      // データを結合（user_idをプロフィール情報に追加）
      const wishlistWithProfiles = data.map(wishlistItem => {
        const profile = profiles.find(profile => profile.id === wishlistItem.user_id);
        return {
          ...wishlistItem,
          profiles: profile
        };
      });

      return wishlistWithProfiles;
    },
    enabled: isOpen,
  });

  // 現在のユーザーがウィッシュリストに追加しているかチェック
  const { data: isInWishlist, isLoading: isCheckingWishlist } = useQuery({
    queryKey: ["is-in-wishlist", itemId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from("wishlists")
        .select("id")
        .eq("official_item_id", itemId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking wishlist:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user && isOpen,
  });

  // ウィッシュリストに追加/削除
  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      if (isInWishlist) {
        // ウィッシュリストから削除
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("official_item_id", itemId)
          .eq("user_id", user.id);
        
        if (error) throw error;
      } else {
        // ウィッシュリストに追加
        const { error } = await supabase
          .from("wishlists")
          .insert([{ official_item_id: itemId, user_id: user.id }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // ウィッシュリストに追加した時のみ効果音を再生
      if (!isInWishlist) {
        playWishlistSound();
      }

      // 即座にリアルタイム更新をトリガー（遅延を最小化）
      const channel = supabase.channel('wishlist-update-trigger');
      channel.send({
        type: 'broadcast',
        event: 'wishlist-changed',
        payload: { itemId, userId: user?.id, immediate: true }
      });
      
      // 必要最小限のクエリのみ無効化
      queryClient.invalidateQueries({ queryKey: ["is-in-wishlist", itemId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-users", itemId] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count", itemId] });
      
      toast({
        title: isInWishlist ? "ウィッシュリストから削除しました" : "ウィッシュリストに追加しました",
        description: `「${itemTitle}」を${isInWishlist ? "削除" : "追加"}しました`,
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "操作に失敗しました",
        variant: "destructive",
      });
      console.error("Error toggling wishlist:", error);
    },
  });

  const handleUserClick = (userId: string) => {
    if (userId && userId !== "unknown") {
      navigate(`/user/${userId}`);
      onClose();
    }
  };

  const handleToggleWishlist = () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "ウィッシュリストに追加するにはログインしてください",
        variant: "destructive",
      });
      return;
    }
    toggleWishlistMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            「{itemTitle}」のウィッシュリスト
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {user && (
            <div className="flex justify-center">
              <Button
                onClick={handleToggleWishlist}
                disabled={toggleWishlistMutation.isPending || isCheckingWishlist}
                variant={isInWishlist ? "outline" : "default"}
                className="flex items-center gap-2"
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
            </div>
          )}
          
          <div className="border-t pt-4">
            <h3 className="font-medium text-sm mb-3">このアイテムをほしい物リストに追加している人</h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
            ) : wishlistUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                まだ誰もこのアイテムをほしい物リストに追加していません
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {wishlistUsers.map((wishlistItem) => (
                <div
                  key={wishlistItem.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={wishlistItem.profiles?.avatar_url || ""} />
                    <AvatarFallback>
                      <UserRound className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {wishlistItem.profiles?.display_name || 
                       wishlistItem.profiles?.username || 
                       "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{wishlistItem.profiles?.username || "unknown"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUserClick(wishlistItem.user_id)}
                    disabled={!wishlistItem.user_id}
                  >
                    プロフィール
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}