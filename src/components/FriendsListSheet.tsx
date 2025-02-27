
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

interface FriendsListSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export function FriendsListSheet({ isOpen, onClose }: FriendsListSheetProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("following");
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
          .select("id, username, avatar_url, bio")
          .ilike("username", `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
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
          
          <div className="flex items-center gap-2 mt-4 bg-accent rounded-full px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="ユーザー名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
          </div>
        </SheetHeader>
        
        {userId ? (
          <div className="p-4">
            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-4">
                <h3 className="font-medium">検索結果</h3>
                {searching ? (
                  <div className="flex justify-center p-4">
                    <p>検索中...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((profile) => (
                      <div 
                        key={profile.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100"
                      >
                        <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => handleUserClick(profile.id)}
                        >
                          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{profile.username}</span>
                            {profile.bio && (
                              <p className="text-sm text-gray-600 line-clamp-1">{profile.bio}</p>
                            )}
                          </div>
                        </div>
                        {profile.id !== userId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFollow(profile.id)}
                          >
                            フォロー
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 p-4">
                    ユーザーが見つかりませんでした
                  </p>
                )}
              </div>
            ) : (
              <Tabs defaultValue="following" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="following" className="flex-1">フォロー中</TabsTrigger>
                  <TabsTrigger value="followers" className="flex-1">フォロワー</TabsTrigger>
                </TabsList>
                
                <TabsContent value="following">
                  <FollowList userId={userId} type="following" />
                </TabsContent>
                
                <TabsContent value="followers">
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
