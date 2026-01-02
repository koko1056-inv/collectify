import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, Grid, Share2, ChevronRight, Sparkles, Package, Crown, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface CollectionOwner {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  items_count: number;
  likes_count: number;
  is_liked: boolean;
  preview_items: {
    id: string;
    image: string;
    title: string;
  }[];
}

export function PublicCollectionView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 人気のコレクションを取得
  const { data: collections, isLoading } = useQuery({
    queryKey: ["public-collections", user?.id],
    queryFn: async () => {
      const { data: likesCounts, error: likesError } = await supabase
        .from("collection_likes")
        .select("collection_owner_id")
        .limit(500);

      if (likesError) throw likesError;

      const likesCountMap = new Map<string, number>();
      likesCounts?.forEach((like) => {
        const count = likesCountMap.get(like.collection_owner_id) || 0;
        likesCountMap.set(like.collection_owner_id, count + 1);
      });

      const { data: usersWithItems, error: usersError } = await supabase
        .from("user_items")
        .select("user_id")
        .limit(100);

      if (usersError) throw usersError;

      const uniqueUserIds = [...new Set(usersWithItems?.map(item => item.user_id) || [])];
      const filteredUserIds = uniqueUserIds.filter(id => id !== user?.id);

      if (filteredUserIds.length === 0) {
        return [];
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .in("id", filteredUserIds)
        .limit(20);

      if (profilesError) throw profilesError;

      const collectionsWithDetails: CollectionOwner[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count: itemsCount } = await supabase
            .from("user_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          const { data: previewItems } = await supabase
            .from("user_items")
            .select("id, image, title")
            .eq("user_id", profile.id)
            .limit(4);

          let isLiked = false;
          if (user?.id) {
            const { data: likeData } = await supabase
              .from("collection_likes")
              .select("id")
              .eq("user_id", user.id)
              .eq("collection_owner_id", profile.id)
              .maybeSingle();
            isLiked = !!likeData;
          }

          return {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            items_count: itemsCount || 0,
            likes_count: likesCountMap.get(profile.id) || 0,
            is_liked: isLiked,
            preview_items: previewItems || [],
          };
        })
      );

      return collectionsWithDetails.sort((a, b) => {
        if (b.likes_count !== a.likes_count) {
          return b.likes_count - a.likes_count;
        }
        return b.items_count - a.items_count;
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ ownerId, isLiked }: { ownerId: string; isLiked: boolean }) => {
      if (!user?.id) throw new Error("ログインが必要です");

      if (isLiked) {
        await supabase
          .from("collection_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("collection_owner_id", ownerId);
      } else {
        await supabase.from("collection_likes").insert({
          user_id: user.id,
          collection_owner_id: ownerId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-collections"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "操作に失敗しました",
      });
    },
  });

  const handleShare = async (collection: CollectionOwner, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/user/${collection.id}`;
    try {
      await navigator.share({
        title: `${collection.username}のコレクション`,
        url,
      });
    } catch {
      navigator.clipboard.writeText(url);
      toast({ title: "リンクをコピーしました" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-background rounded-xl border p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="aspect-square bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!collections?.length) {
    return (
      <div className="text-center py-12">
        <div className="bg-muted/50 rounded-full p-6 w-fit mx-auto mb-4">
          <Package className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">まだ公開コレクションがありません</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          他のユーザーがグッズを登録すると表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 rounded-full">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">人気のコレクション</h2>
          <p className="text-xs text-muted-foreground">みんなの素敵なコレクションをチェック</p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {collections.length}人
        </Badge>
      </div>

      {/* コレクションカード */}
      <div className="space-y-3">
        {collections.map((collection, index) => (
          <div
            key={collection.id}
            className="bg-background rounded-xl border hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group"
            onClick={() => navigate(`/user/${collection.id}`)}
          >
            {/* ヘッダー部分 */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-3">
                {/* ランキングバッジ（上位3位まで） */}
                {index < 3 && (
                  <div className={`absolute -left-1 -top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                  }`}>
                    {index + 1}
                  </div>
                )}
                
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
                    <AvatarImage src={collection.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                      {collection.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {index === 0 && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {collection.username}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {collection.items_count}個
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {collection.likes_count}
                    </span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant={collection.is_liked ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      likeMutation.mutate({
                        ownerId: collection.id,
                        isLiked: collection.is_liked,
                      })
                    }
                    disabled={!user || likeMutation.isPending}
                    className={`rounded-full h-9 px-3 ${
                      collection.is_liked 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${collection.is_liked ? "fill-current" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-9 w-9 hover:bg-muted"
                    onClick={(e) => handleShare(collection, e)}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* プレビュー画像グリッド */}
            <div className="px-4 pb-3">
              <div className="grid grid-cols-4 gap-1.5 rounded-lg overflow-hidden">
                {collection.preview_items.map((item, itemIndex) => (
                  <div 
                    key={item.id} 
                    className="aspect-square relative overflow-hidden rounded-lg"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
                {collection.preview_items.length < 4 &&
                  [...Array(4 - collection.preview_items.length)].map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center"
                    >
                      <Grid className="w-5 h-5 text-muted-foreground/20" />
                    </div>
                  ))}
              </div>
            </div>

            {/* フッター */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  コレクションを見る
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
