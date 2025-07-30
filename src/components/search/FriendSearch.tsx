import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Search } from "lucide-react";
import { FollowButton } from "@/components/profile/FollowButton";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  interests?: (string | { name: string; [key: string]: any })[];
  followers_count?: number;
  following_count?: number;
}

interface FriendSearchProps {
  userInterests?: string[];
}

export function FriendSearch({ userInterests = [] }: FriendSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState<string>("all");

  console.log("FriendSearch: userInterests received:", userInterests);

  // ユーザー一覧を取得（遅延読み込み）
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles", "search", searchQuery, selectedInterest],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, interests, followers_count, following_count")
        .neq("id", user?.id || "")
        .limit(20); // 最大20件に制限

      // 検索クエリがある場合のみフィルタリング
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.toLowerCase();
        query = query.or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user && (searchQuery.trim().length >= 2 || selectedInterest !== "all"),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // 利用可能な興味のコンテンツ一覧
  const { data: contentNamesData = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("name")
        .order("name");
      if (error) throw error;
      // データベースから返されるオブジェクトの構造を正しく処理
      return data?.map(item => item.name).filter(Boolean) || [];
    },
  });

  // フィルタリングされたプロファイル（データベースレベルでフィルタリング済み）
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    
    // 興味でフィルタ（データベースクエリで検索済みなので、興味のみクライアントサイドでフィルタ）
    if (selectedInterest !== "all") {
      return profiles.filter(profile => {
        if (!profile.interests || !Array.isArray(profile.interests)) return false;
        return profile.interests.some(interest => {
          const interestName = typeof interest === 'string' ? interest : 
                              (interest && typeof interest === 'object' && 'name' in interest) ? 
                              interest.name : String(interest);
          return interestName === selectedInterest;
        });
      });
    }

    return profiles;
  }, [profiles, selectedInterest]);

  // おすすめユーザー（共通の興味を持つユーザー）
  const recommendedProfiles = useMemo(() => {
    if (userInterests.length === 0) return [];
    
    return profiles
      .filter(profile => {
        if (!profile.interests || !Array.isArray(profile.interests)) return false;
        return profile.interests.some(interest => {
          const interestName = typeof interest === 'string' ? interest : 
                              (interest && typeof interest === 'object' && 'name' in interest) ? 
                              interest.name : String(interest);
          return userInterests.includes(interestName);
        });
      })
      .slice(0, 5);
  }, [profiles, userInterests]);

  const handleProfileClick = (profileId: string) => {
    navigate(`/user/${profileId}`);
  };

  if (isLoading && (searchQuery.trim().length >= 2 || selectedInterest !== "all")) {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="ユーザー名やプロフィールで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-background rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-skeleton-base rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-skeleton-base rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-skeleton-base rounded animate-pulse w-1/2" />
                </div>
                <div className="h-8 w-20 bg-skeleton-base rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="ユーザー名やプロフィールで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 興味フィルター */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">興味でフィルター</h3>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedInterest === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedInterest("all")}
              className="shrink-0"
            >
              すべて
            </Button>
            {contentNamesData.map((content, index) => {
              const contentName = typeof content === 'string' ? content : 
                                 (content && typeof content === 'object' && content && 'name' in content) ? 
                                 (content as any).name : String(content);
              return (
                <Button
                  key={`${contentName}-${index}`}
                  variant={selectedInterest === contentName ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInterest(contentName)}
                  className="shrink-0"
                >
                  {contentName}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* おすすめユーザー */}
      {recommendedProfiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            おすすめのユーザー
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {recommendedProfiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => handleProfileClick(profile.id)}
                    >
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {profile.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleProfileClick(profile.id)}
                        className="text-left w-full"
                      >
                        <h4 className="font-medium truncate hover:underline">
                          {profile.display_name || profile.username}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                        {profile.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {profile.bio}
                          </p>
                        )}
                      </button>
                      
                      {/* 興味のバッジ */}
                      {profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                           {profile.interests.slice(0, 3).map((interest, index) => {
                             const interestName = typeof interest === 'string' ? interest : 
                                                  (interest && typeof interest === 'object' && 'name' in interest) ? 
                                                  (interest as any).name : String(interest);
                             return (
                               <Badge key={`${interestName}-${index}`} variant="secondary" className="text-xs">
                                 {interestName}
                               </Badge>
                             );
                           })}
                          {profile.interests.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.interests.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-muted-foreground text-center">
                        <div>{profile.followers_count || 0} フォロワー</div>
                        <div>{profile.following_count || 0} フォロー中</div>
                      </div>
                      <FollowButton userId={profile.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 検索結果 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          ユーザー検索結果 ({filteredProfiles.length}件)
        </h3>
        
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>検索条件に一致するユーザーが見つかりません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => handleProfileClick(profile.id)}
                    >
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {profile.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleProfileClick(profile.id)}
                        className="text-left w-full"
                      >
                        <h4 className="font-medium truncate hover:underline">
                          {profile.display_name || profile.username}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                        {profile.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {profile.bio}
                          </p>
                        )}
                      </button>
                      
                      {/* 興味のバッジ */}
                      {profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                           {profile.interests.slice(0, 3).map((interest, index) => {
                             const interestName = typeof interest === 'string' ? interest : 
                                                  (interest && typeof interest === 'object' && 'name' in interest) ? 
                                                  (interest as any).name : String(interest);
                             return (
                               <Badge key={`${interestName}-${index}`} variant="secondary" className="text-xs">
                                 {interestName}
                               </Badge>
                             );
                           })}
                          {profile.interests.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.interests.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-muted-foreground text-center">
                        <div>{profile.followers_count || 0} フォロワー</div>
                        <div>{profile.following_count || 0} フォロー中</div>
                      </div>
                      <FollowButton userId={profile.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}