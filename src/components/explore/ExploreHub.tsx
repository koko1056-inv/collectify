import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Sparkles,
  Crown,
  Home as HomeIcon,
  User,
  Package,
  Wand2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ExploreRoomCard, type ExploreRoom } from "./ExploreRoomCard";
import { useMyAiBookmarks } from "@/hooks/ai-room/useAiBookmarks";

type ExploreTab = "rooms" | "avatars" | "collections" | "users";

export function ExploreHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as ExploreTab) || "rooms";
  const [activeTab, setActiveTab] = useState<ExploreTab>(
    ["rooms", "avatars", "collections", "users"].includes(initialTab) ? initialTab : "rooms"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleTabChange = (v: string) => {
    setActiveTab(v as ExploreTab);
    setSearchParams({ tab: v });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pb-24">
        {/* ヘッダー */}
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  探索
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  みんなのAI作品とコレクションを覗いてみよう
                </p>
              </div>
            </div>

            {/* 検索バー */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="作品やユーザーを検索..."
                className="pl-10"
              />
            </div>
          </div>

          {/* タブ */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="px-4">
            <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-1 sm:gap-4 p-0 h-auto overflow-x-auto scrollbar-hide">
              <TabsTrigger
                value="rooms"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-1 text-muted-foreground data-[state=active]:text-foreground gap-1.5"
              >
                <HomeIcon className="w-4 h-4" />
                AIルーム
              </TabsTrigger>
              <TabsTrigger
                value="avatars"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-1 text-muted-foreground data-[state=active]:text-foreground gap-1.5"
              >
                <Wand2 className="w-4 h-4" />
                AIアバター
              </TabsTrigger>
              <TabsTrigger
                value="collections"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-1 text-muted-foreground data-[state=active]:text-foreground gap-1.5"
              >
                <Package className="w-4 h-4" />
                コレクション
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-1 text-muted-foreground data-[state=active]:text-foreground gap-1.5"
              >
                <User className="w-4 h-4" />
                ユーザー
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* コンテンツ */}
        <div className="container mx-auto px-4 py-6">
          {activeTab === "rooms" && <RoomsTab searchQuery={searchQuery} />}
          {activeTab === "avatars" && <AvatarsTab searchQuery={searchQuery} />}
          {activeTab === "collections" && <CollectionsTab searchQuery={searchQuery} />}
          {activeTab === "users" && <UsersTab searchQuery={searchQuery} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============= AIルームタブ =============
const PAGE_SIZE = 24;

function RoomsTab({ searchQuery }: { searchQuery: string }) {
  const { data: bookmarks } = useMyAiBookmarks();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["explore-ai-rooms"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rooms, error } = await supabase
        .from("ai_generated_rooms")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;

      const userIds = Array.from(new Set((rooms || []).map((r) => r.user_id)));
      const profilesMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, display_name")
          .in("id", userIds);
        (profiles || []).forEach((p) => profilesMap.set(p.id, p));
      }

      return (rooms || []).map((r) => ({
        ...r,
        profile: profilesMap.get(r.user_id) || null,
      })) as ExploreRoom[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });

  const allRooms: ExploreRoom[] = (data?.pages.flat() || []) as ExploreRoom[];
  const filtered = searchQuery
    ? allRooms.filter(
        (r) =>
          r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.style_prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allRooms;

  if (isLoading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="break-inside-avoid mb-3 rounded-2xl bg-muted animate-pulse"
            style={{ height: 160 + ((i * 37) % 120) }}
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState icon={HomeIcon} message="まだ公開AI作品がありません" />;
  }

  return (
    <div className="space-y-4">
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
        {filtered.map((room) => (
          <ExploreRoomCard
            key={room.id}
            room={room}
            isBookmarked={bookmarks?.has(`room:${room.id}`) || false}
          />
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "読み込み中..." : "もっと見る"}
          </Button>
        </div>
      )}
    </div>
  );
}


// ============= AIアバタータブ（プレースホルダー） =============
function AvatarsTab({ searchQuery }: { searchQuery: string }) {
  // 公開アバターテーブルの整備が必要。Phase 3でフル実装予定。
  return (
    <EmptyState
      icon={Wand2}
      message="AIアバター探索はまもなく公開予定"
      description="他ユーザーのAI生成アバターをここから見つけられるようになります"
    />
  );
}

// ============= コレクションタブ =============
function CollectionsTab({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();

  const { data: collectors = [], isLoading } = useQuery({
    queryKey: ["explore-collectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name, bio")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (p) => {
          const { count } = await supabase
            .from("user_items")
            .select("id", { count: "exact", head: true })
            .eq("user_id", p.id);
          return { ...p, item_count: count || 0 };
        })
      );
      // アイテム数の多い順
      return enriched.sort((a, b) => b.item_count - a.item_count).filter((p) => p.item_count > 0);
    },
  });

  const filtered = searchQuery
    ? collectors.filter(
        (c) =>
          c.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : collectors;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState icon={Package} message="まだコレクションを公開しているユーザーがいません" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filtered.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate(`/user/${c.id}`)}
          className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all text-left"
        >
          <Avatar className="w-14 h-14 border-2 border-border">
            <AvatarImage src={c.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {c.username?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{c.display_name || c.username}</p>
            <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-primary">
              <Package className="w-3 h-3" />
              <span className="font-medium">{c.item_count}</span>
              <span className="text-muted-foreground">点のグッズ</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============= ユーザータブ =============
function UsersTab({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["explore-featured-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name, followers_count, bio")
        .order("followers_count", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = searchQuery
    ? users.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState icon={User} message="ユーザーが見つかりません" />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {filtered.map((u) => (
        <button
          key={u.id}
          onClick={() => navigate(`/user/${u.id}`)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="relative">
            <Avatar className="w-16 h-16 border-2 border-border">
              <AvatarImage src={u.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {u.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {(u.followers_count || 0) >= 10 && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                <Crown className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <span className="text-sm font-medium truncate max-w-full">
            {u.display_name || u.username}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {u.followers_count || 0} フォロワー
          </span>
        </button>
      ))}
    </div>
  );
}

// ============= 共通: 空ステート =============
function EmptyState({
  icon: Icon,
  message,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  description?: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-foreground font-medium mb-1">{message}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
