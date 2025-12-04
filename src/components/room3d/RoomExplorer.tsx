import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Search, 
  TrendingUp, 
  Users, 
  Sparkles, 
  Heart,
  Eye,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeaturedRoom {
  id: string;
  title: string;
  user_id: string;
  background_image: string | null;
  visit_count: number;
  profile?: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
  };
  like_count: number;
  item_count: number;
}

export function RoomExplorer() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"trending" | "featured" | "new">("trending");

  // 人気のルームを取得
  const { data: trendingRooms = [], isLoading: loadingTrending } = useQuery({
    queryKey: ["trending-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("binder_pages")
        .select(`
          id,
          title,
          user_id,
          background_image,
          visit_count,
          is_public
        `)
        .eq("is_main_room", true)
        .eq("is_public", true)
        .order("visit_count", { ascending: false })
        .limit(20);

      if (error) throw error;

      // プロフィール情報を追加
      const roomsWithProfiles = await Promise.all(
        (data || []).map(async (room) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url, display_name")
            .eq("id", room.user_id)
            .single();

          const { count: likeCount } = await supabase
            .from("room_likes")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id);

          const { count: itemCount } = await supabase
            .from("binder_items")
            .select("*", { count: "exact", head: true })
            .eq("binder_page_id", room.id);

          return {
            ...room,
            profile,
            like_count: likeCount || 0,
            item_count: itemCount || 0,
          } as FeaturedRoom;
        })
      );

      return roomsWithProfiles;
    },
  });

  // 注目のユーザーを取得
  const { data: featuredUsers = [] } = useQuery({
    queryKey: ["featured-room-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name, followers_count")
        .order("followers_count", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">
              Explore
            </h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/")}
            >
              マイルームへ
            </Button>
          </div>
          
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ルームを検索..."
              className="pl-10"
            />
          </div>
        </div>

        {/* タブ */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="px-4">
          <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 p-0">
            <TabsTrigger 
              value="trending" 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none pb-3 text-muted-foreground data-[state=active]:text-foreground"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              トレンド
            </TabsTrigger>
            <TabsTrigger 
              value="featured"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none pb-3 text-muted-foreground data-[state=active]:text-foreground"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              注目
            </TabsTrigger>
            <TabsTrigger 
              value="new"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none pb-3 text-muted-foreground data-[state=active]:text-foreground"
            >
              新着
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* コンテンツ */}
      <div className="container mx-auto px-4 py-6">
        {/* 注目のユーザー */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-muted-foreground" />
            Featured Users
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {featuredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => navigate(`/user/${user.id}`)}
                className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent transition-colors"
              >
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-border">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground truncate max-w-[80px]">
                  {user.display_name || user.username}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ルーム一覧 */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            Popular This Week
          </h2>
          
          {loadingTrending ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-square rounded-2xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {trendingRooms.map((room, index) => (
                <RoomCard key={room.id} room={room} rank={index + 1} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RoomCard({ room, rank }: { room: FeaturedRoom; rank: number }) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(`/room/${room.id}`)}
      className="group relative aspect-square rounded-2xl overflow-hidden bg-muted hover:scale-[1.02] transition-transform"
    >
      {/* 背景画像 */}
      {room.background_image && (
        <img 
          src={room.background_image} 
          alt={room.title}
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
        />
      )}
      
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
      
      {/* ランキングバッジ */}
      {rank <= 3 && (
        <div className={cn(
          "absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border",
          rank === 1 && "bg-foreground text-background border-foreground",
          rank === 2 && "bg-muted-foreground text-background border-muted-foreground",
          rank === 3 && "bg-secondary text-secondary-foreground border-border"
        )}>
          {rank}
        </div>
      )}
      
      {/* ユーザー情報 */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-6 h-6 border border-border">
            <AvatarImage src={room.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              {room.profile?.username?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground/90 text-sm truncate">
            {room.profile?.display_name || room.profile?.username}
          </span>
        </div>
        
        <h3 className="text-foreground font-medium text-sm truncate mb-1">
          {room.title}
        </h3>
        
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {room.visit_count}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {room.like_count}
          </span>
        </div>
      </div>
    </button>
  );
}
