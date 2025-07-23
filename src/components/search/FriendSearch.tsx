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
  interests?: string[];
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

  // ユーザー一覧を取得
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles", "search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, interests, followers_count, following_count")
        .neq("id", user?.id || ""); // 自分は除外

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
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
      console.log("Content names raw data:", data);
      const names = data?.map(item => {
        console.log("Processing item:", item);
        return typeof item === 'string' ? item : item.name;
      }) || [];
      console.log("Processed names:", names);
      return names;
    },
  });

  // フィルタリングされたプロファイル
  const filteredProfiles = useMemo(() => {
    let filtered = profiles;

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(profile => 
        profile.username?.toLowerCase().includes(query) ||
        profile.display_name?.toLowerCase().includes(query) ||
        profile.bio?.toLowerCase().includes(query)
      );
    }

    // 興味でフィルタ
    if (selectedInterest !== "all") {
      filtered = filtered.filter(profile => 
        profile.interests?.includes(selectedInterest)
      );
    }

    return filtered;
  }, [profiles, searchQuery, selectedInterest]);

  // おすすめユーザー（共通の興味を持つユーザー）
  const recommendedProfiles = useMemo(() => {
    if (userInterests.length === 0) return [];
    
    return profiles
      .filter(profile => 
        profile.interests?.some(interest => userInterests.includes(interest))
      )
      .slice(0, 5);
  }, [profiles, userInterests]);

  const handleProfileClick = (profileId: string) => {
    navigate(`/user/${profileId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            {contentNamesData.map((content) => (
              <Button
                key={content}
                variant={selectedInterest === content ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedInterest(content)}
                className="shrink-0"
              >
                {content}
              </Button>
            ))}
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
                      {profile.interests && profile.interests.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {profile.interests.slice(0, 3).map((interest) => (
                            <Badge key={interest} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
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
                      {profile.interests && profile.interests.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {profile.interests.slice(0, 3).map((interest) => (
                            <Badge key={interest} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
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