import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Grid, MessageCircle, Share2 } from "lucide-react";
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

  // 人気のコレクションを取得（全ユーザーのコレクションを公開として扱う）
  const { data: collections, isLoading } = useQuery({
    queryKey: ["public-collections", user?.id],
    queryFn: async () => {
      // まずコレクションいいね数を取得
      const { data: likesCounts, error: likesError } = await supabase
        .from("collection_likes")
        .select("collection_owner_id")
        .limit(500);

      if (likesError) throw likesError;

      // いいね数をカウント
      const likesCountMap = new Map<string, number>();
      likesCounts?.forEach((like) => {
        const count = likesCountMap.get(like.collection_owner_id) || 0;
        likesCountMap.set(like.collection_owner_id, count + 1);
      });

      // アイテムを持っているユーザーを取得（コレクションは基本公開）
      const { data: usersWithItems, error: usersError } = await supabase
        .from("user_items")
        .select("user_id")
        .limit(100);

      if (usersError) throw usersError;

      // ユニークなユーザーIDを取得
      const uniqueUserIds = [...new Set(usersWithItems?.map(item => item.user_id) || [])];
      
      // 自分を除外
      const filteredUserIds = uniqueUserIds.filter(id => id !== user?.id);

      if (filteredUserIds.length === 0) {
        return [];
      }

      // プロフィール情報を取得
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .in("id", filteredUserIds)
        .limit(20);

      if (profilesError) throw profilesError;

      // ユーザーのコレクションプレビューを取得
      const collectionsWithDetails: CollectionOwner[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // アイテム数を取得
          const { count: itemsCount } = await supabase
            .from("user_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          // プレビュー用アイテムを取得
          const { data: previewItems } = await supabase
            .from("user_items")
            .select("id, image, title")
            .eq("user_id", profile.id)
            .limit(4);

          // 現在のユーザーがいいねしているか確認
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

      // いいね数とアイテム数でソート
      return collectionsWithDetails.sort((a, b) => {
        if (b.likes_count !== a.likes_count) {
          return b.likes_count - a.likes_count;
        }
        return b.items_count - a.items_count;
      });
    },
  });

  // いいねトグル
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

  const handleShare = async (collection: CollectionOwner) => {
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
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!collections?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Grid className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">まだ公開コレクションがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary" />
        人気のコレクション
      </h2>

      {collections.map((collection) => (
        <Card key={collection.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* ユーザー情報 */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                className="h-12 w-12 cursor-pointer"
                onClick={() => navigate(`/user/${collection.id}`)}
              >
                <AvatarImage src={collection.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {collection.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p
                  className="font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate(`/user/${collection.id}`)}
                >
                  {collection.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {collection.items_count}個のグッズ
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                  className="gap-1"
                >
                  <Heart
                    className={`w-4 h-4 ${collection.is_liked ? "fill-current" : ""}`}
                  />
                  {collection.likes_count}
                </Button>
              </div>
            </div>

            {/* プレビュー画像 */}
            <div
              className="grid grid-cols-4 gap-1 cursor-pointer"
              onClick={() => navigate(`/user/${collection.id}`)}
            >
              {collection.preview_items.map((item) => (
                <div key={item.id} className="aspect-square rounded overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
              {collection.preview_items.length < 4 &&
                [...Array(4 - collection.preview_items.length)].map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square rounded bg-muted flex items-center justify-center"
                  >
                    <Grid className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                ))}
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/user/${collection.id}`)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                コレクションを見る
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShare(collection)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
