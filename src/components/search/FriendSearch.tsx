import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Search, Sparkles, ChevronRight, UserPlus } from "lucide-react";
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

  // ユーザー一覧を取得
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles", "search", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, interests, followers_count, following_count")
        .neq("id", user?.id || "")
        .limit(50);

      if (searchQuery.trim()) {
        const searchTerm = searchQuery.toLowerCase();
        query = query.or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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
      return data?.map(item => item.name).filter(Boolean) || [];
    },
  });

  // 興味名を抽出するヘルパー
  const getInterestName = (interest: string | { name: string; [key: string]: any }) => {
    return typeof interest === 'string' ? interest : 
           (interest && typeof interest === 'object' && 'name' in interest) ? 
           interest.name : String(interest);
  };

  // フィルタリングされたプロファイル
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    
    let filtered = profiles;

    if (selectedInterest !== "all") {
      filtered = filtered.filter(profile => {
        if (!profile.interests || !Array.isArray(profile.interests)) return false;
        return profile.interests.some(interest => getInterestName(interest) === selectedInterest);
      });
    }

    return filtered;
  }, [profiles, selectedInterest]);

  // おすすめユーザー（共通の興味を持つユーザー）
  const recommendedProfiles = useMemo(() => {
    if (userInterests.length === 0) return [];
    
    return profiles
      .filter(profile => {
        if (!profile.interests || !Array.isArray(profile.interests)) return false;
        return profile.interests.some(interest => userInterests.includes(getInterestName(interest)));
      })
      .slice(0, 5);
  }, [profiles, userInterests]);

  // 共通の興味を取得
  const getCommonInterests = (profileInterests: Profile['interests']) => {
    if (!profileInterests || !Array.isArray(profileInterests)) return [];
    return profileInterests
      .map(getInterestName)
      .filter(interest => userInterests.includes(interest));
  };

  const handleProfileClick = (profileId: string) => {
    navigate(`/user/${profileId}`);
  };

  // ユーザーカードコンポーネント
  const UserCard = ({ profile, showCommon = false }: { profile: Profile; showCommon?: boolean }) => {
    const commonInterests = getCommonInterests(profile.interests);
    
    return (
      <div 
        className="flex items-center gap-3 p-3 bg-background rounded-xl border hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
        onClick={() => handleProfileClick(profile.id)}
      >
        <div className="relative">
          <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {profile.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showCommon && commonInterests.length > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
              <Sparkles className="h-3 w-3" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {profile.display_name || profile.username}
            </h4>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            @{profile.username}
          </p>
          
          {profile.bio && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {profile.bio}
            </p>
          )}
          
          {/* 共通の興味をハイライト */}
          {showCommon && commonInterests.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {commonInterests.slice(0, 2).map((interest, index) => (
                <Badge 
                  key={`common-${interest}-${index}`} 
                  className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  {interest}
                </Badge>
              ))}
              {commonInterests.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{commonInterests.length - 2}
                </Badge>
              )}
            </div>
          )}
          
          {/* 興味のバッジ（共通でない場合） */}
          {!showCommon && profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {profile.interests.slice(0, 2).map((interest, index) => (
                <Badge 
                  key={`${getInterestName(interest)}-${index}`} 
                  variant="secondary" 
                  className="text-xs"
                >
                  {getInterestName(interest)}
                </Badge>
              ))}
              {profile.interests.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.interests.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="text-xs text-muted-foreground text-right">
            <span className="font-medium text-foreground">{profile.followers_count || 0}</span> フォロワー
          </div>
          <FollowButton userId={profile.id} />
        </div>
        
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="ユーザー名やプロフィールで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-full bg-muted/50 border-0 focus-visible:ring-2"
          />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-background rounded-xl p-4 border animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-9 w-24 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 検索バー - LINEスタイル */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          placeholder="ユーザー名やプロフィールで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-full bg-muted/50 border-0 focus-visible:ring-2 text-base"
        />
      </div>

      {/* 興味フィルター - チップスタイル */}
      <div className="space-y-2">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-1">
            <Button
              variant={selectedInterest === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedInterest("all")}
              className="shrink-0 rounded-full h-9 px-4"
            >
              すべて
            </Button>
            {contentNamesData.map((content, index) => {
              const contentName = typeof content === 'string' ? content : 
                                 (content && typeof content === 'object' && 'name' in (content as any)) ? 
                                 (content as any).name : null;
              if (!contentName) return null;
              return (
                <Button
                  key={`${contentName}-${index}`}
                  variant={selectedInterest === contentName ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInterest(contentName)}
                  className="shrink-0 rounded-full h-9 px-4"
                >
                  {contentName}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* おすすめユーザー - カルーセル風 */}
      {recommendedProfiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">
              あなたにおすすめ
            </h3>
            <Badge variant="secondary" className="ml-auto">
              共通の趣味
            </Badge>
          </div>
          
          <div className="space-y-2">
            {recommendedProfiles.map((profile) => (
              <UserCard key={profile.id} profile={profile} showCommon={true} />
            ))}
          </div>
        </div>
      )}

      {/* 検索結果 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="bg-muted p-2 rounded-full">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">
            ユーザー一覧
          </h3>
          <Badge variant="outline" className="ml-auto">
            {filteredProfiles.length}人
          </Badge>
        </div>
        
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="bg-muted/50 rounded-full p-6 w-fit mx-auto mb-4">
              <UserPlus className="h-10 w-10 opacity-50" />
            </div>
            <p className="font-medium">ユーザーが見つかりません</p>
            <p className="text-sm mt-1">検索条件を変更してみてください</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProfiles.map((profile) => (
              <UserCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
