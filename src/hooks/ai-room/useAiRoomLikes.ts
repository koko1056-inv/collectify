import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

/** 自分がいいねした公開AIルームの id 集合 */
export function useMyAiRoomLikes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-room-likes", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("ai_room_likes")
        .select("room_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data || []).map((l) => l.room_id));
    },
  });
}

/**
 * いいねの切り替え。
 * 判定と like_count の同期はサーバー側（toggle_ai_room_like + トリガ）が行う。
 */
export function useToggleAiRoomLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!user?.id) throw new Error(t("notices.common.loginRequired"));
      const { data, error } = await supabase.rpc("toggle_ai_room_like", {
        _room_id: roomId,
      });
      if (error) throw error;
      return data as { liked: boolean; like_count: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-room-likes"] });
      qc.invalidateQueries({ queryKey: ["explore-ai-rooms"] });
      qc.invalidateQueries({ queryKey: ["ai-rooms-public"] });
      qc.invalidateQueries({ queryKey: ["ai-room-detail"] });
    },
    onError: (e) => {
      toast.error((e as Error).message || t("notices.common.errorTitle"));
    },
  });
}
