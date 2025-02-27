
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { FollowList } from "./profile/FollowList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";

interface FriendsListSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  followers_count?: number;
  following_count?: number;
}

export function FriendsListSheet({ isOpen, onClose }: FriendsListSheetProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("following");
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        toast({
          title: "エラー",
          description: "ログインが必要です",
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    if (isOpen) {
      fetchCurrentUser();
    }
  }, [isOpen, navigate, toast]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, bio, followers_count, following_count")
          .ilike("username", `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
        
        // ユーザーのコレクション数を取得
        if (data && data.length > 0) {
          fetchCollectionCounts(data.map(p => p.id));
        }
      } catch (error) {
        console.error("Error searching users:", error);
        toast({
          title: "検索エラー",
          description: "ユーザーの検索中にエラーが発生しました",
          variant: "destructive",
        });
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, toast]);

  const fetchCollectionCounts = async (profileIds: string[]) => {
    try {
      const counts: Record<string, number> = {};
      
      // 各ユーザーのコレクション数を取得
      const promises = profileIds.map(async (profileId) => {
        const { count, error } = await supabase
          .from("user_items")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", profileId);
          
        if (error) throw error;
        counts[profileId] = count || 0;
      });
      
      await Promise.all(promises);
      setCollectionCounts(counts);
    } catch (error) {
      console.error("Error fetching collection counts:", error);
    }
  };

  const handleFollow = async (profileId: string) => {
    if (!userId) return;

    try {
      // 既にフォローしているか確認
      const { data: existingFollow, error: checkError } = await supabase
        .from("follows")
        .select()
        .eq("follower_id", userId)
        .eq("following_id", profileId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingFollow) {
        toast({
          title: "情報",
          description: "既にフォローしています",
        });
        return;
      }

      // フォロー関係を作成
      const { error: followError } = await supabase
        .from("follows")
        .insert([
          { follower_id: userId, following_id: profileId }
        ]);

      if (followError) throw followError;

      toast({
        title: "成功",
        description: "ユーザーをフォローしました",
      });

      // フォロー成功後にフォロー中タブに切り替え
      setActiveTab("following");
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error following user:", error);
      toast({
        title: "エラー",
        description: "フォローできませんでした",
        variant: "destructive",
      });
    }
  };

  const handleUserClick = (profileId: string) => {
    navigate(`/user/${profileId}`);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90%] p-0">
        <SheetHeader className="border-b p-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="-ml-2">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <SheetTitle>フレンド</SheetTitle>
          </div>
          
          <div className="flex items-center gap-2 mt-3 bg-accent rounded-full px-3 py-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="ユーザー名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-8 text-sm"
            />
          </div>
        </SheetHeader>
        
        {userId ? (
          <div className="p-4 h-[calc(100%-120px)] overflow-hidden">
            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-4 h-full">
                <h3 className="font-medium">検索結果</h3>
                {searching ? (
                  <div className="flex justify-center p-4">
                    <p>検索中...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-4 pr-4 pb-4">
                      {searchResults.map((profile) => (
                        <div 
                          key={profile.id} 
                          className="flex flex-col gap-2 p-3 rounded-lg hover:bg-gray-100"
                        >
                          <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => handleUserClick(profile.id)}
                          >
                            <Avatar className="h-10 w-10">
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt={profile.username}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <span className="font-medium">{profile.username}</span>
                              {profile.bio && (
                                <p className="text-sm text-gray-600 line-clamp-1">{profile.bio}</p>
                              )}
                            </div>
                            {profile.id !== userId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFollow(profile.id);
                                }}
                              >
                                フォロー
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex gap-4 text-xs text-gray-500 mt-1">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold">{profile.following_count || 0}</span>
                              <span>フォロー中</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="font-semibold">{profile.followers_count || 0}</span>
                              <span>フォロワー</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="font-semibold">{collectionCounts[profile.id] || 0}</span>
                              <span>コレクション</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-gray-500 p-4">
                    ユーザーが見つかりませんでした
                  </p>
                )}
              </div>
            ) : (
              <Tabs defaultValue="following" value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="following" className="flex-1">フォロー中</TabsTrigger>
                  <TabsTrigger value="followers" className="flex-1">フォロワー</TabsTrigger>
                </TabsList>
                
                <TabsContent value="following" className="h-[calc(100%-56px)]">
                  <FollowList userId={userId} type="following" />
                </TabsContent>
                
                <TabsContent value="followers" className="h-[calc(100%-56px)]">
                  <FollowList userId={userId} type="followers" />
                </TabsContent>
              </Tabs>
            )}
          </div>
        ) : (
          <div className="p-4 flex items-center justify-center h-40">
            <p>読み込み中...</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
