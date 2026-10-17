import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Crown, DoorOpen, Heart, Home as HomeIcon, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { RoomScene } from "@/components/oshi/room/RoomScene";
import { OshiRoomViewDialog } from "@/components/oshi/room/OshiRoomViewDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { OSHI_ROOM_SORTS, sceneGoodsMap, useOshiRoomList, type OshiRoomCard, type OshiRoomSort } from "@/hooks/useOshiRoomSocial";
import { timeOfDayJst } from "@/lib/oshiRoom";
import { getInitial } from "@/utils/initial";
import { IconTile } from "@/components/ui/icon-tile";
import { OshiDiscoveryPanel } from "@/components/releases/OshiDiscoveryPanel";
import { cn } from "@/lib/utils";

const SORT_ICON = { new: Sparkles, popular: Heart, oshi: Users } as const;
const SORT_LABEL = { new: "oshiRoom.social.explore.sortNew", popular: "oshiRoom.social.explore.sortPopular", oshi: "oshiRoom.social.explore.sortOshi" } as const;

/**
 * 「みんな」の「お部屋」タブ。みんなの推しの部屋を、小さな部屋の絵のカードで並べる。
 *  - 並び: 新着（部屋を保存した新しい順）・人気（いいねの多い順）・同じ推し（自分の好きな作品と推しグッズの作品が重なる人）
 *  - 見られる範囲はコレクションと同じ。非公開の人・ブロックの関係にある人・自分は、サーバー（list_oshi_rooms）が出さない
 *  - カードをタップすると部屋を大きく開き、いいね・シェア・プロフィールへ進める
 *  - ?room=<id> で開くと、その部屋を開いた状態にする（シェアのリンク）
 */
export function OshiRoomsTab({ searchQuery }: { searchQuery: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort: OshiRoomSort = (OSHI_ROOM_SORTS as string[]).includes(searchParams.get("sort") ?? "") ? (searchParams.get("sort") as OshiRoomSort) : "new";
  const list = useOshiRoomList(sort);
  const openId = searchParams.get("room");

  const setSort = (v: OshiRoomSort) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", v);
    next.delete("room");
    setSearchParams(next, { replace: true });
  };
  const openRoom = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("room", id);
    else next.delete("room");
    setSearchParams(next, { replace: !id });
  };

  const rooms = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);
  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? rooms.filter((r) => (r.displayName ?? "").toLowerCase().includes(q) || r.username.toLowerCase().includes(q) || r.goods.some((g) => (g.content_name ?? "").toLowerCase().includes(q) || g.title.toLowerCase().includes(q))) : rooms;

  // 開いている部屋。一覧に無い（シェアのリンクから来た）ときは、名前だけ読んで部屋は開いてから読む
  const openCard = openId ? (rooms.find((r) => r.userId === openId) ?? null) : null;
  const linked = useQuery({
    queryKey: ["oshi-room-owner", openId],
    enabled: !!openId && !openCard && !list.isLoading,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", openId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const openName = openCard ? (openCard.displayName || openCard.username) : (linked.data?.display_name || linked.data?.username || "");

  // 下まで来たら次を読む（「もっと見る」も残す: 読み上げ・キーボードでも進めるように）
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const time = timeOfDayJst();
  // 部屋がまだ少ない（3つ未満）うちは、見て回るものが無い。自分の部屋づくりへの誘いを上に出し、
  // 一覧の下には推しの新着・発売予定を出す（検索中は出さない: 探しているものと関係が無い）
  const few = !list.isLoading && !list.isError && !q && rooms.length < 3 && !hasNextPage;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("oshiRoom.social.explore.sortAria")}>
          {OSHI_ROOM_SORTS.map((v) => {
            const Icon = SORT_ICON[v];
            return (
              <Button key={v} size="sm" variant={sort === v ? "default" : "outline"} className="rounded-full" aria-pressed={sort === v} onClick={() => setSort(v)}>
                <Icon className="mr-1 h-4 w-4" />
                {t(SORT_LABEL[v])}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">{t("oshiRoom.social.explore.intro")}</p>
        <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1 rounded-full px-2 text-xs text-muted-foreground" onClick={() => navigate("/oshi")}>
          <DoorOpen className="h-4 w-4" />
          {t("oshiRoom.social.explore.myRoom")}
        </Button>
      </div>

      {few && filtered.length > 0 && (
        <button
          type="button"
          onClick={() => navigate("/oshi")}
          data-testid="oshi-rooms-invite"
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-left hover:bg-primary/10"
        >
          <IconTile size="sm" tone="primary">
            <DoorOpen />
          </IconTile>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t("discover.empty.roomsInviteTitle")}</span>
            <span className="block text-xs text-muted-foreground">{t("discover.empty.roomsInviteDesc")}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {list.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-[360/500] w-full rounded-2xl" />
          ))}
        </div>
      ) : list.isError ? (
        <QueryErrorState title={t("oshiRoom.social.explore.loadFailed")} onRetry={() => void list.refetch()} />
      ) : filtered.length === 0 ? (
        // 0件は「最初の1人になろう」: 自分の部屋を飾る入口を出す
        sort === "oshi" ? (
          <EmptyState
            icon={Users}
            message={t("oshiRoom.social.explore.emptyOshi")}
            description={t("oshiRoom.social.explore.emptyOshiDesc")}
            action={<Button variant="outline" onClick={() => setSort("new")}>{t("discover.empty.roomsSeeAll")}</Button>}
          />
        ) : (
          <EmptyState
            icon={HomeIcon}
            message={q ? t("oshiRoom.social.explore.empty") : t("discover.empty.roomsFirstTitle")}
            description={q ? t("oshiRoom.social.explore.emptyDesc") : t("discover.empty.roomsFirstDesc")}
            action={
              <Button onClick={() => navigate("/oshi")} className="gap-1.5">
                <DoorOpen className="h-4 w-4" />
                {t("discover.empty.roomsDecorate")}
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="oshi-room-grid">
            {filtered.map((room) => (
              <OshiRoomCardView key={room.userId} room={room} time={time} onOpen={() => openRoom(room.userId)} />
            ))}
          </div>
          <div ref={sentinel} aria-hidden="true" />
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? t("chrome.common.loading") : t("chrome.common.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}

      {few && (
        <OshiDiscoveryPanel className="border-t border-border pt-5" title={t("discover.panel.fillTitle")} description={t("discover.panel.fillDesc")} />
      )}

      {/* 名前が分かってから開く（見出しが空のまま一瞬出ないように） */}
      {openId && !list.isLoading && (openCard || !linked.isPending) && (
        <OshiRoomViewDialog
          profileId={openId}
          name={openName}
          card={openCard}
          username={openCard?.username ?? linked.data?.username}
          avatarUrl={openCard?.avatarUrl ?? linked.data?.avatar_url}
          open
          onOpenChange={(o) => !o && openRoom(null)}
        />
      )}
    </div>
  );
}

/**
 * 1部屋のカード。部屋は小さな見本（動かない・触れない）で描き、下に持ち主・いいね・なかよしLvの合計。
 * 画面の外のカードは描くのを後回しにする（content-visibility）。一覧が長くなっても重くならないように
 */
export const OshiRoomCardView = memo(function OshiRoomCardView({ room, time, onOpen }: { room: OshiRoomCard; time: ReturnType<typeof timeOfDayJst>; onOpen: () => void }) {
  const { t } = useLanguage();
  const name = room.displayName || room.username;
  const goods = useMemo(() => sceneGoodsMap(room.goods), [room.goods]);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all [contain-intrinsic-size:auto_320px] [content-visibility:auto] hover:border-primary/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={t("oshiRoom.social.explore.cardAria", { name, likes: room.likes, bond: room.bondTotal })}
    >
      <div className="relative p-1.5 pb-0">
        <RoomScene state={room.state} goods={goods} oshi={room.oshiColor} time={time} mode="readonly" reduceMotion thumb className="rounded-xl shadow-none" label={t("oshiRoom.roomAriaOf", { name })} />
        {room.bondBest >= 2 && (
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-background/85 px-1.5 py-0.5 text-3xs font-bold shadow-sm backdrop-blur-sm">
            <Crown className="h-3 w-3 text-points" />
            <span className="tabular-nums">{t("oshiRoom.social.explore.bond", { n: room.bondBest })}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-2">
        <Avatar className="h-6 w-6 shrink-0 border border-border">
          <AvatarImage src={room.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-secondary text-3xs text-secondary-foreground">{getInitial(room.displayName, room.username)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-xs font-bold">{name}</span>
        <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-2xs font-bold tabular-nums", room.likedByMe ? "text-primary" : "text-muted-foreground")}>
          <Heart className={cn("h-3.5 w-3.5", room.likedByMe && "fill-primary")} />
          {room.likes}
        </span>
      </div>
      <div className="flex items-center gap-1 px-2 pb-2 text-3xs text-muted-foreground">
        <span className="truncate">
          {t("oshiRoom.view.bondTotal")} <span className="font-bold tabular-nums text-foreground">{room.bondTotal}</span>
        </span>
      </div>
    </button>
  );
});
