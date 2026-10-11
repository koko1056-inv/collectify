import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { resolveOshiColor, type OshiColor } from "@/lib/cosmetics";
import { DEFAULT_FLOOR, DEFAULT_WALLPAPER, parseLayout, roomAsset, type RoomLayout } from "@/lib/oshiRoom";

/** 推しの部屋（保存されている形）。layout が null なら、まだ保存していない（基本の部屋を描く） */
export interface OshiRoomData {
  wallpaper: string;
  floor: string;
  layout: RoomLayout | null;
  oshiColor: OshiColor;
}

/**
 * 部屋を読む（本人・他の人とも）。見られないプロフィール（非公開など）は null。
 * 見られるかどうかは get_profile_oshi_room がコレクションと同じ範囲（can_view_collection）で決める
 */
export function useProfileOshiRoom(profileId: string | undefined) {
  return useQuery({
    queryKey: ["oshi-room", profileId],
    enabled: !!profileId,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<OshiRoomData | null> => {
      const { data, error } = await supabase.rpc("get_profile_oshi_room", { _profile_id: profileId! });
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      // 目録から消えた（またはアプリが古くて知らない）壁紙・床は、基本のものに戻して描く
      const wallpaper = roomAsset(row.wallpaper_key)?.kind === "wallpaper" ? row.wallpaper_key! : DEFAULT_WALLPAPER;
      const floor = roomAsset(row.floor_key)?.kind === "floor" ? row.floor_key! : DEFAULT_FLOOR;
      return { wallpaper, floor, layout: parseLayout(row.layout), oshiColor: resolveOshiColor(row.oshi_color) };
    },
  });
}

/** 保存の失敗（save_oshi_room の RAISE の文言）。買っていない物を置いた / 自分の物でない / 大きすぎる / 形が変 */
export type RoomSaveError = "room_item_locked" | "not_your_item" | "layout_too_large" | "invalid" | "unknown";

export function roomSaveErrorCode(e: unknown): RoomSaveError {
  const message = e instanceof Error ? e.message : ((e as { message?: string })?.message ?? "");
  if (message.includes("room_item_locked")) return "room_item_locked";
  if (message.includes("not_your_item")) return "not_your_item";
  if (message.includes("layout_too_large") || message.includes("too_many")) return "layout_too_large";
  if (message.includes("invalid_layout") || message.includes("invalid_room_key")) return "invalid";
  return "unknown";
}

export function useSaveOshiRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ wallpaper, floor, layout }: { wallpaper: string; floor: string; layout: RoomLayout }) => {
      const { error } = await supabase.rpc("save_oshi_room", {
        _wallpaper_key: wallpaper,
        _floor_key: floor,
        _layout: layout as unknown as Json,
      });
      if (error) throw error;
      return { wallpaper, floor, layout };
    },
    onSuccess: (saved) => {
      // 保存した形をすぐ画面に出す（取り直しを待つと、一瞬だけ前の配置に戻って見える）
      qc.setQueryData<OshiRoomData | null>(["oshi-room", user?.id], (prev) => ({
        wallpaper: saved.wallpaper,
        floor: saved.floor,
        layout: saved.layout,
        oshiColor: prev?.oshiColor ?? "pink",
      }));
      void qc.invalidateQueries({ queryKey: ["oshi-room", user?.id] });
    },
  });
}
