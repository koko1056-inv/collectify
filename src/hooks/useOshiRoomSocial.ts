import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveOshiColor, type OshiColor } from "@/lib/cosmetics";
import { DEFAULT_FLOOR, DEFAULT_WALLPAPER, defaultLayout, mergeGoods, parseLayout, roomAsset, type RoomLayout, type RoomState } from "@/lib/oshiRoom";
import type { SceneGoods } from "@/components/oshi/room/RoomScene";
import type { Companion } from "@/hooks/useOshi";

/**
 * 推しの部屋の「みんなで見る・いいねする」まわり。
 *  - list_oshi_rooms … 「みんな」の「お部屋」タブの一覧（新着・人気・同じ推し）。部屋を描くのに要るものを1回でまとめて受け取る
 *  - get_oshi_room_likes / set_oshi_room_like … 部屋のいいねの数と、付け外し
 *  - get_my_oshi_room_likers … 自分の部屋にいいねした人
 * 見られる範囲（コレクションと同じ・ブロックの関係は出さない）はサーバーが決める。
 */

export type OshiRoomSort = "new" | "popular" | "oshi";
export const OSHI_ROOM_SORTS: OshiRoomSort[] = ["new", "popular", "oshi"];
export const OSHI_ROOM_PAGE = 12;

export interface OshiRoomGoods {
  user_item_id: string;
  title: string;
  image: string;
  content_name: string | null;
  level: number;
  rank: number;
}

/** 一覧の1部屋（カードに描くもの一式） */
export interface OshiRoomCard {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isSample: boolean | null;
  state: RoomState;
  oshiColor: OshiColor;
  goods: OshiRoomGoods[];
  bondTotal: number;
  bondBest: number;
  likes: number;
  likedByMe: boolean;
  updatedAt: string | null;
}

/** 保存された部屋（無ければ基本の部屋）に、いまの推しグッズを合わせる。自分の部屋・他の人の部屋・一覧で同じ決まり */
export function roomStateFrom(wallpaper: string | null | undefined, floor: string | null | undefined, layout: RoomLayout | null, goodsIds: string[]): RoomState {
  return {
    // 目録から消えた（またはアプリが古くて知らない）壁紙・床は、基本のものに戻して描く
    wallpaper: wallpaper && roomAsset(wallpaper)?.kind === "wallpaper" ? wallpaper : DEFAULT_WALLPAPER,
    floor: floor && roomAsset(floor)?.kind === "floor" ? floor : DEFAULT_FLOOR,
    layout: layout ? mergeGoods(layout, goodsIds) : defaultLayout(goodsIds),
  };
}

/** 推しグッズの一覧から、部屋の絵に渡す形（id → 写真・レベル・順位）を作る */
export function sceneGoodsMap(goods: { user_item_id: string; title: string; image: string; level: number; rank: number }[]): Map<string, SceneGoods> {
  const m = new Map<string, SceneGoods>();
  for (const g of goods) m.set(g.user_item_id, { title: g.title, image: g.image, level: g.level, rank: g.rank });
  return m;
}

export type CareAction = "pat" | "polish" | "photo";

/** 今日のお世話の残り。順位の高い推しから見て、まだ済んでいない最初のグッズと、その次にすること */
export function nextCare(list: Companion[], today: string): { target: Companion; done: number; action: CareAction } | null {
  for (const c of list) {
    const flags: [CareAction, boolean][] = [
      ["pat", c.last_pat_on === today],
      ["polish", c.last_polish_on === today],
      ["photo", c.last_photo_on === today],
    ];
    const done = flags.filter(([, v]) => v).length;
    const todo = flags.find(([, v]) => !v);
    if (todo) return { target: c, done, action: todo[0] };
  }
  return null;
}

/** 推しの部屋を開くリンク（「みんな」のお部屋タブで、その部屋を開いた状態になる）。シェアに使う */
export function oshiRoomUrl(profileId: string): string {
  return `${window.location.origin}/explore?tab=oshi-rooms&room=${encodeURIComponent(profileId)}`;
}

function parseGoods(raw: unknown): OshiRoomGoods[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is Record<string, unknown> => !!g && typeof g === "object" && typeof (g as { user_item_id?: unknown }).user_item_id === "string")
    .map((g) => ({
      user_item_id: g.user_item_id as string,
      title: typeof g.title === "string" ? g.title : "",
      image: typeof g.image === "string" ? g.image : "",
      content_name: typeof g.content_name === "string" ? g.content_name : null,
      level: typeof g.level === "number" ? g.level : 1,
      rank: typeof g.rank === "number" ? g.rank : 1,
    }));
}

export function useOshiRoomList(sort: OshiRoomSort, enabled = true) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ["oshi-rooms", sort, user?.id],
    enabled: enabled && !!user?.id,
    initialPageParam: 0,
    staleTime: 1000 * 60,
    queryFn: async ({ pageParam }): Promise<OshiRoomCard[]> => {
      const { data, error } = await supabase.rpc("list_oshi_rooms", {
        _sort: sort,
        _limit: OSHI_ROOM_PAGE,
        _offset: (pageParam as number) * OSHI_ROOM_PAGE,
      });
      if (error) throw error;
      return (data ?? []).map((r) => {
        const goods = parseGoods(r.goods);
        return {
          userId: r.user_id,
          username: r.username,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          isSample: r.is_sample,
          state: roomStateFrom(r.wallpaper_key, r.floor_key, parseLayout(r.layout), goods.map((g) => g.user_item_id)),
          oshiColor: resolveOshiColor(r.oshi_color),
          goods,
          bondTotal: r.bond_total,
          bondBest: r.bond_best,
          likes: r.likes,
          likedByMe: r.liked_by_me,
          updatedAt: r.updated_at,
        };
      });
    },
    getNextPageParam: (last, all) => (last.length === OSHI_ROOM_PAGE ? all.length : undefined),
  });
}

export interface OshiRoomLikes {
  likes: number;
  likedByMe: boolean;
}

/** 部屋のいいねの数と、自分がいいねしているか。見られない部屋は null */
export function useOshiRoomLikes(ownerId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["oshi-room-likes", ownerId, user?.id],
    enabled: !!ownerId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<OshiRoomLikes | null> => {
      const { data, error } = await supabase.rpc("get_oshi_room_likes", { _owner: ownerId! });
      if (error) throw error;
      const row = data?.[0];
      return row ? { likes: row.likes, likedByMe: row.liked_by_me } : null;
    },
  });
}

/** いいねの失敗（set_oshi_room_like の RAISE・ブロックのトリガー）。画面の文言を出し分ける */
export type RoomLikeError = "own" | "unavailable" | "blocked" | "unknown";

export function roomLikeErrorCode(e: unknown): RoomLikeError {
  const err = e as { message?: string; hint?: string };
  const message = err?.message ?? "";
  if (message.includes("cannot_like_own_room")) return "own";
  if (message.includes("room_not_visible") || message.includes("room_empty")) return "unavailable";
  if (err?.hint === "BLOCKED") return "blocked";
  return "unknown";
}

/**
 * いいねを付ける・外す。押した瞬間に画面の数を動かし（待たせない）、サーバーの答えでそろえる。失敗したら元に戻す。
 * 一覧（どの並びでも）と、開いている部屋の数を一緒に動かす
 */
export function useToggleOshiRoomLike() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const apply = (ownerId: string, next: OshiRoomLikes) => {
    qc.setQueryData<OshiRoomLikes | null>(["oshi-room-likes", ownerId, user?.id], next);
    qc.setQueriesData<InfiniteData<OshiRoomCard[]>>({ queryKey: ["oshi-rooms"] }, (prev) =>
      prev
        ? { ...prev, pages: prev.pages.map((page) => page.map((r) => (r.userId === ownerId ? { ...r, likes: next.likes, likedByMe: next.likedByMe } : r))) }
        : prev
    );
  };

  return useMutation({
    mutationFn: async ({ ownerId, liked }: { ownerId: string; liked: boolean; current: OshiRoomLikes }) => {
      const { data, error } = await supabase.rpc("set_oshi_room_like", { _owner: ownerId, _liked: liked });
      if (error) throw error;
      const row = data?.[0];
      return { likes: row?.likes ?? 0, likedByMe: row?.liked ?? liked };
    },
    onMutate: ({ ownerId, liked, current }) => {
      const optimistic = {
        likes: Math.max(0, current.likes + (liked === current.likedByMe ? 0 : liked ? 1 : -1)),
        likedByMe: liked,
      };
      apply(ownerId, optimistic);
      return { previous: current };
    },
    onError: (_e, { ownerId }, ctx) => {
      if (ctx?.previous) apply(ownerId, ctx.previous);
    },
    onSuccess: (server, { ownerId }) => apply(ownerId, server),
  });
}

export interface OshiRoomLiker {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isSample: boolean | null;
  likedAt: string;
}

/** 自分の部屋にいいねした人（新しい順・50人まで） */
export function useMyOshiRoomLikers(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["oshi-room-likers", user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<OshiRoomLiker[]> => {
      const { data, error } = await supabase.rpc("get_my_oshi_room_likers", { _limit: 50, _offset: 0 });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        isSample: r.is_sample,
        likedAt: r.liked_at,
      }));
    },
  });
}
