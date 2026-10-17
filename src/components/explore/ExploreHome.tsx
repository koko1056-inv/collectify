import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronRight, Package, PackageSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useItemPostsFeed } from "@/hooks/item-posts/useItemPostsFeed";
import { useOshiRoomList } from "@/hooks/useOshiRoomSocial";
import { timeOfDayJst } from "@/lib/oshiRoom";
import { getInitial } from "@/utils/initial";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { WeeklyPromptBanner } from "@/components/item-posts/WeeklyPromptBanner";
import { OshiRoomCardView } from "./OshiRoomsTab";

/**
 * 「みんな」の最初の画面。タブを並べず、お題・新着の投稿・推しの部屋・AI作品・人気のユーザー・グッズ探しを
 * それぞれ少しずつ縦に並べ、「すべて」から今までの一覧（?tab=…）へ進む。
 * 以前は見出し・説明・検索・5つのタブ・投稿ボタン・お題・並び替え・作品の札（3〜4行）が重なり、
 * 最初の投稿が上から約580pxまで押し下げられていた。投稿がまだ少ないうちも、ほかの楽しみが同じ画面に見える
 */
export function ExploreHome({ onOpenTab }: { onOpenTab: (tab: string, extra?: Record<string, string>) => void }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  const posts = useItemPostsFeed({ mode: "new", limit: 6 });
  const rooms = useOshiRoomList("popular", !!user);
  const roomList = (rooms.data?.pages.flat() ?? []).slice(0, 2);
  const time = timeOfDayJst();

  const aiRooms = useQuery({
    queryKey: ["explore-home-ai-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_generated_rooms")
        .select("id, title, image_url")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  const users = useQuery({
    queryKey: ["explore-home-users", user?.id],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .order("followers_count", { ascending: false })
        .limit(9);
      if (user?.id) q = q.neq("id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const postList = (posts.data ?? []).filter((p) => p.images?.length > 0).slice(0, 6);

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <WeeklyPromptBanner
        onPost={(tag) => onOpenTab("posts", { compose: tag })}
        onBrowse={(tag) => onOpenTab("posts", { tag })}
      />

      <HomeSection title={t("chrome.explore.home.posts")} onSeeAll={() => onOpenTab("posts")}>
        {posts.isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : postList.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-sm text-muted-foreground">{t("chrome.explore.home.noPosts")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {postList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => (user ? navigate(`/post/${p.id}`) : onOpenTab("posts"))}
                className="overflow-hidden rounded-xl bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={p.caption || t("chrome.explore.home.posts")}
              >
                <img
                  src={getOptimizedImageUrl(p.images[0].image_url, { width: 300 })}
                  onError={fallbackToOriginal(p.images[0].image_url)}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </HomeSection>

      {user && (rooms.isLoading || roomList.length > 0) && (
        <HomeSection title={t("chrome.explore.home.rooms")} onSeeAll={() => onOpenTab("oshi-rooms")}>
          {rooms.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {roomList.map((room) => (
                <OshiRoomCardView
                  key={room.userId}
                  room={room}
                  time={time}
                  onOpen={() => onOpenTab("oshi-rooms", { room: room.userId })}
                />
              ))}
            </div>
          )}
        </HomeSection>
      )}

      {(aiRooms.data?.length ?? 0) > 0 && (
        <HomeSection title={t("chrome.explore.home.ai")} onSeeAll={() => onOpenTab("ai")}>
          <div className="grid grid-cols-3 gap-2">
            {aiRooms.data!.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/ai-work/${r.id}`)}
                className="overflow-hidden rounded-xl bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={r.title || t("chrome.explore.home.ai")}
              >
                <img
                  src={getOptimizedImageUrl(r.image_url, { width: 300 })}
                  onError={fallbackToOriginal(r.image_url)}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        </HomeSection>
      )}

      {(users.data?.length ?? 0) > 0 && (
        <HomeSection title={t("chrome.explore.home.users")} onSeeAll={() => onOpenTab("users")}>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {users.data!.map((u) => {
              const name = u.display_name || u.username || "";
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => navigate(`/user/${u.id}`)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={u.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{getInitial(name)}</AvatarFallback>
                  </Avatar>
                  <span className="w-full truncate text-center text-2xs">{name}</span>
                </button>
              );
            })}
          </div>
        </HomeSection>
      )}

      <HomeSection title={t("chrome.explore.home.goods")} onSeeAll={() => onOpenTab("items")}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => onOpenTab("items")}>
            <PackageSearch className="mr-1 h-4 w-4" />
            {t("engage.explore.tabItems")}
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate("/search")}>
            <Package className="mr-1 h-4 w-4" />
            {t("chrome.explore.browseCatalog")}
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate("/image-search")}>
            <Camera className="mr-1 h-4 w-4" />
            {t("chrome.explore.searchByPhoto")}
          </Button>
        </div>
      </HomeSection>
    </div>
  );
}

function HomeSection({ title, onSeeAll, children }: { title: string; onSeeAll: () => void; children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <section className="space-y-2.5" aria-label={title}>
      <div className="flex items-center">
        <h2 className="flex-1 text-base font-bold">{title}</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="-mr-2 inline-flex items-center rounded-lg px-2 py-1.5 text-sm font-bold text-primary hover:bg-primary/5"
        >
          {t("chrome.explore.home.seeAll")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {children}
    </section>
  );
}
