import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Heart, Sparkles, Users, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TradeRequestModal } from "./TradeRequestModal";

interface MatchedUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  matched_items: {
    their_item: {
      id: string;
      title: string;
      image: string;
      user_id: string;
    };
    your_wishlist_item: {
      id: string;
      title: string;
    };
  }[];
}

interface WantingUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  wanted_items: {
    your_item: {
      id: string;
      title: string;
      image: string;
    };
  }[];
}

export function TradeMatchingSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedMatch, setSelectedMatch] = useState<{
    userId: string;
    itemId: string;
    itemTitle: string;
  } | null>(null);

  // ユーザーのウィッシュリストを取得
  const { data: wishlistItems } = useQuery({
    queryKey: ["user-wishlist", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          id,
          official_item_id,
          original_item_id,
          official_items (id, title, image),
          original_items (id, title, image)
        `)
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 自分のアイテムを取得
  const { data: myItems } = useQuery({
    queryKey: ["my-items-for-matching", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, official_item_id, original_item_id")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // マッチングするユーザーを検索（あなたの欲しいものを持っている人）
  const { data: matchedUsers, isLoading: isLoadingMatched } = useQuery({
    queryKey: ["trade-matches", user?.id, wishlistItems],
    queryFn: async () => {
      if (!user?.id || !wishlistItems?.length) return [];

      const officialItemIds = wishlistItems
        .filter(w => w.official_item_id)
        .map(w => w.official_item_id);
      
      const originalItemIds = wishlistItems
        .filter(w => w.original_item_id)
        .map(w => w.original_item_id);

      if (officialItemIds.length === 0 && originalItemIds.length === 0) {
        return [];
      }

      // ユーザーの欲しいものを持っている人を検索
      let query = supabase
        .from("user_items")
        .select(`
          id,
          title,
          image,
          user_id,
          official_item_id,
          original_item_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .neq("user_id", user.id)
        .limit(20);

      // ORクエリを構築
      const orConditions: string[] = [];
      if (officialItemIds.length > 0) {
        orConditions.push(`official_item_id.in.(${officialItemIds.join(",")})`);
      }
      if (originalItemIds.length > 0) {
        orConditions.push(`original_item_id.in.(${originalItemIds.join(",")})`);
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(","));
      }

      const { data: matchingItems, error } = await query;

      if (error) throw error;

      // ユーザーごとにグループ化
      const userMap = new Map<string, MatchedUser>();
      
      matchingItems?.forEach((item: any) => {
        const profile = item.profiles;
        if (!profile) return;

        const matchedWishlistItem = wishlistItems.find(
          w => w.official_item_id === item.official_item_id || 
               w.original_item_id === item.original_item_id
        );

        if (!matchedWishlistItem) return;

        const wishlistItemData = matchedWishlistItem.official_items || matchedWishlistItem.original_items;

        if (!userMap.has(profile.id)) {
          userMap.set(profile.id, {
            user_id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            matched_items: [],
          });
        }

        userMap.get(profile.id)!.matched_items.push({
          their_item: {
            id: item.id,
            title: item.title,
            image: item.image,
            user_id: item.user_id,
          },
          your_wishlist_item: {
            id: wishlistItemData?.id || "",
            title: wishlistItemData?.title || "",
          },
        });
      });

      return Array.from(userMap.values());
    },
    enabled: !!user?.id && !!wishlistItems?.length,
  });

  // 自分のアイテムを欲しがっている人を検索
  const { data: wantingUsers, isLoading: isLoadingWanting } = useQuery({
    queryKey: ["wanting-users", user?.id, myItems],
    queryFn: async () => {
      if (!user?.id || !myItems?.length) return [];

      const officialItemIds = myItems
        .filter(item => item.official_item_id)
        .map(item => item.official_item_id);
      
      const originalItemIds = myItems
        .filter(item => item.original_item_id)
        .map(item => item.original_item_id);

      if (officialItemIds.length === 0 && originalItemIds.length === 0) {
        return [];
      }

      // 自分のアイテムをウィッシュリストに入れている人を検索
      let query = supabase
        .from("wishlists")
        .select(`
          id,
          user_id,
          official_item_id,
          original_item_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .neq("user_id", user.id)
        .limit(50);

      const orConditions: string[] = [];
      if (officialItemIds.length > 0) {
        orConditions.push(`official_item_id.in.(${officialItemIds.join(",")})`);
      }
      if (originalItemIds.length > 0) {
        orConditions.push(`original_item_id.in.(${originalItemIds.join(",")})`);
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(","));
      }

      const { data: wantingData, error } = await query;

      if (error) throw error;

      // ユーザーごとにグループ化
      const userMap = new Map<string, WantingUser>();
      
      wantingData?.forEach((wishlist: any) => {
        const profile = wishlist.profiles;
        if (!profile) return;

        // 自分のアイテムでマッチするものを探す
        const matchedItem = myItems.find(
          item => item.official_item_id === wishlist.official_item_id || 
                  item.original_item_id === wishlist.original_item_id
        );

        if (!matchedItem) return;

        if (!userMap.has(profile.id)) {
          userMap.set(profile.id, {
            user_id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            wanted_items: [],
          });
        }

        // 重複チェック
        const existingItems = userMap.get(profile.id)!.wanted_items;
        if (!existingItems.some(i => i.your_item.id === matchedItem.id)) {
          existingItems.push({
            your_item: {
              id: matchedItem.id,
              title: matchedItem.title,
              image: matchedItem.image,
            },
          });
        }
      });

      return Array.from(userMap.values());
    },
    enabled: !!user?.id && !!myItems?.length,
  });

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">ログインしてマッチングを確認</p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = isLoadingMatched || isLoadingWanting;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-primary animate-pulse" />
          <p className="mt-2 text-muted-foreground">マッチングを検索中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* あなたの欲しいものを持っている人 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            あなたの欲しいものを持っている人
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!matchedUsers?.length ? (
            <div className="text-center py-6">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm">
                まだマッチングがありません
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ウィッシュリストに欲しいグッズを追加すると、マッチングが見つかります
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchedUsers.map((matchedUser) => (
                <div
                  key={matchedUser.user_id}
                  className="bg-background rounded-lg p-3 border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar 
                      className="h-10 w-10 cursor-pointer"
                      onClick={() => navigate(`/user/${matchedUser.user_id}`)}
                    >
                      <AvatarImage src={matchedUser.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {matchedUser.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p 
                        className="font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/user/${matchedUser.user_id}`)}
                      >
                        {matchedUser.username}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {matchedUser.matched_items.length}個マッチ
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {matchedUser.matched_items.slice(0, 4).map((match, idx) => (
                      <div
                        key={idx}
                        className="relative group cursor-pointer"
                        onClick={() => setSelectedMatch({
                          userId: matchedUser.user_id,
                          itemId: match.their_item.id,
                          itemTitle: match.their_item.title,
                        })}
                      >
                        <div className="aspect-square rounded-lg overflow-hidden border">
                          <img
                            src={match.their_item.image}
                            alt={match.their_item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <ArrowLeftRight className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-xs mt-1 truncate">{match.their_item.title}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => navigate(`/user/${matchedUser.user_id}`)}
                  >
                    コレクションを見る
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* あなたのアイテムを欲しがっている人 */}
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-amber-500" />
            あなたのアイテムを欲しがっている人
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!wantingUsers?.length ? (
            <div className="text-center py-6">
              <Gift className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm">
                まだマッチングがありません
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                あなたのコレクションを欲しがっている人が見つかると表示されます
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wantingUsers.map((wantingUser) => (
                <div
                  key={wantingUser.user_id}
                  className="bg-background rounded-lg p-3 border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar 
                      className="h-10 w-10 cursor-pointer"
                      onClick={() => navigate(`/user/${wantingUser.user_id}`)}
                    >
                      <AvatarImage src={wantingUser.avatar_url || undefined} />
                      <AvatarFallback className="bg-amber-500/10 text-amber-500">
                        {wantingUser.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p 
                        className="font-medium cursor-pointer hover:text-amber-500 transition-colors"
                        onClick={() => navigate(`/user/${wantingUser.user_id}`)}
                      >
                        {wantingUser.username}
                      </p>
                      <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700">
                        <Heart className="w-3 h-3 mr-1" />
                        {wantingUser.wanted_items.length}個欲しがっている
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {wantingUser.wanted_items.slice(0, 4).map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden border border-amber-500/20">
                          <img
                            src={item.your_item.image}
                            alt={item.your_item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs mt-1 truncate">{item.your_item.title}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => navigate(`/user/${wantingUser.user_id}`)}
                  >
                    相手のコレクションを見る
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMatch && (
        <TradeRequestModal
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          requestedItemId={selectedMatch.itemId}
          requestedItemTitle={selectedMatch.itemTitle}
          receiverId={selectedMatch.userId}
        />
      )}
    </div>
  );
}
