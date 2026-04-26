import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AiGeneratedRoom } from "./useAiRooms";

/** AI作品(ルーム)単体取得 + 投稿者プロフィール */
export function useAiRoomDetail(roomId: string | undefined) {
  return useQuery({
    queryKey: ["ai-room-detail", roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const { data: room, error } = await supabase
        .from("ai_generated_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      if (error) throw error;
      if (!room) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", (room as any).user_id)
        .maybeSingle();
      return { room: room as AiGeneratedRoom, profile };
    },
    enabled: !!roomId,
  });
}

/** リミックス系統: 親作品と派生作品 */
export function useRemixLineage(room: AiGeneratedRoom | null | undefined) {
  return useQuery({
    queryKey: ["ai-room-lineage", room?.id, room?.parent_room_id],
    queryFn: async () => {
      if (!room) return { parent: null, children: [] };
      const [parentRes, childrenRes] = await Promise.all([
        room.parent_room_id
          ? supabase
              .from("ai_generated_rooms")
              .select("*")
              .eq("id", room.parent_room_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        supabase
          .from("ai_generated_rooms")
          .select("*")
          .eq("parent_room_id", room.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return {
        parent: (parentRes.data || null) as AiGeneratedRoom | null,
        children: (childrenRes.data || []) as AiGeneratedRoom[],
      };
    },
    enabled: !!room,
  });
}
