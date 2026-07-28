import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import { ExploreAvatarCard } from "./ExploreAvatarCard";
import {
  usePublicAvatars,
  useMyAvatarLikes,
  type ExploreAvatar,
} from "@/hooks/ai-avatar/usePublicAvatars";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ExploreRoomCard, type ExploreRoom } from "./ExploreRoomCard";
import { useMyAiBookmarks } from "@/hooks/ai-room/useAiBookmarks";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/features/matching/useMatches";
import { MatchCard } from "@/features/matching/MatchCard";
import { CollectionDiffModal } from "@/features/matching/CollectionDiffModal";
import { useLanguage } from "@/contexts/LanguageContext";

type ExploreTab = "rooms" | "avatars" | "collections" | "users";

export function ExploreHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as ExploreTab) || "rooms";
  const [activeTab, setActiveTab] = useState<ExploreTab>(
    ["rooms", "avatars", "collections", "users"].includes(initialTab) ? initialTab : "rooms"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();

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
                  {t("chrome.explore.title")}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("chrome.explore.subtitle")}
                </p>
              </div>
            </div>

            {/* 検索バー */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("chrome.explore.searchPlaceholder")}
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
                {t("chrome.explore.tabRooms")}
              </TabsTrigger>
              <TabsTrigger
                value="avatars"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-1 text-muted-foreground data-[state=active]:text-foreground gap-1.5"
              >
                <Wand2 className="w-4 h-4" />
                {t("chrome.explore.tabAvatars")}
              </TabsTrigger>
              <TabsTrigger
                value="collections"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-1 text-muted-foreground data-[state=active]:text-foreground gap-1.5"
              >
                <Package className="w-4 h-4" />
                {t("chrome.explore.tabCollections")}
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-1 text-muted-foreground data-[state=active]:text-foreground gap-1.5"
              >
                <User className="w-4 h-4" />
                {t("chrome.explore.tabUsers")}
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
  const { t } = useLanguage();

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
          <Skeleton
            key={i}
            className="break-inside-avoid mb-3 rounded-2xl"
            style={{ height: 160 + ((i * 37) % 120) }}
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState icon={HomeIcon} message={t("chrome.explore.emptyRooms")} />;
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
            {isFetchingNextPage ? t("chrome.common.loading") : t("chrome.common.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}


// ============= AIアバタータブ =============
function AvatarsTab({ searchQuery }: { searchQuery: string }) {
  const { data: bookmarks } = useMyAiBookmarks();
  const { data: likes } = useMyAvatarLikes();
  const { t } = useLanguage();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = usePublicAvatars();

  const allAvatars: ExploreAvatar[] = data?.pages.flat() ?? [];
  const q = searchQuery.toLowerCase();
  const filtered = q
    ? allAvatars.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.prompt?.toLowerCase().includes(q) ||
          a.profile?.username?.toLowerCase().includes(q)
      )
    : allAvatars;

  if (isLoading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton
            key={i}
            className="break-inside-avoid mb-3 rounded-2xl"
            style={{ height: 160 + ((i * 37) % 120) }}
          />
        ))}
      </div>
    );
  }

  // 通信失敗を「公開アバターが無い」と見せてしまわないよう区別する
  if (isError) {
    return (
      <QueryErrorState
        title={t("chrome.explore.avatarsLoadFailed")}
        onRetry={() => refetch()}
      />
    );
  }

  if (filtered.length === 0) {
    // 公開はオプトインなので、最初は誰も公開していない状態がありうる。
    // 「準備中」ではなく「まだ無い」と伝え、公開の導線を出す。
    return (
      <EmptyState
        icon={Wand2}
        message={t("chrome.explore.emptyAvatars")}
        description={t("chrome.explore.emptyAvatarsDesc")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
        {filtered.map((avatar) => (
          <ExploreAvatarCard
            key={avatar.id}
            avatar={avatar}
            isBookmarked={bookmarks?.has(`avatar:${avatar.id}`) || false}
            isLiked={likes?.has(avatar.id) || false}
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
            {isFetchingNextPage ? t("chrome.common.loading") : t("chrome.common.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============= コレクションタブ =============
function CollectionsTab({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

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
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState icon={Package} message={t("chrome.explore.emptyCollections")} />;
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
              <span className="font-medium">{t("chrome.explore.goodsCount", { n: c.item_count })}</span>
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: matches = [], isLoading: matchesLoading } = useMatches(user?.id, 12);
  const [compareWith, setCompareWith] = useState<string | null>(null);

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

  const showMatchSection = !!user && !searchQuery && (matchesLoading || matches.length > 0);

  return (
    <div className="space-y-8">
      {/* 同担マッチセクション */}
      {showMatchSection && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold">{t("chrome.explore.matchTitle")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("chrome.explore.matchDesc")}
          </p>
          {matchesLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {[...Array(3)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="shrink-0 w-[280px] h-72 rounded-2xl"
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {matches.map((m) => (
                <div
                  key={m.candidate_id}
                  className="shrink-0 w-[280px] sm:w-[320px] snap-start"
                >
                  <MatchCard match={m} onCompare={setCompareWith} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 人気ユーザー */}
      <section className="space-y-3">
        {showMatchSection && (
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{t("chrome.explore.popularUsers")}</h2>
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={User} message={t("chrome.explore.noUsers")} />
        ) : (
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
                  {t("chrome.explore.followers", { n: u.followers_count || 0 })}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <CollectionDiffModal
        meId={user?.id}
        otherId={compareWith}
        open={!!compareWith}
        onOpenChange={(o) => !o && setCompareWith(null)}
      />
    </div>
  );
}
