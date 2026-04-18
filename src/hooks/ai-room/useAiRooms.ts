import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AiGeneratedRoom {
  id: string;
  user_id: string;
  image_url: string;
  style_preset: string | null;
  style_prompt: string | null;
  custom_prompt: string | null;
  source_item_images: string[] | null;
  title: string | null;
  is_public: boolean;
  like_count: number;
  created_at: string;
}

/** 指定ユーザーのAIルーム一覧 */
export function useUserAiRooms(userId: string | undefined) {
  return useQuery({
    queryKey: ["ai-rooms", userId],
    queryFn: async (): Promise<AiGeneratedRoom[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("ai_generated_rooms")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AiGeneratedRoom[];
    },
    enabled: !!userId,
  });
}

/** 公開AIルームフィード */
export function usePublicAiRooms(limit = 30) {
  return useQuery({
    queryKey: ["ai-rooms-public", limit],
    queryFn: async (): Promise<AiGeneratedRoom[]> => {
      const { data, error } = await supabase
        .from("ai_generated_rooms")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as AiGeneratedRoom[];
    },
  });
}

export interface GenerateInput {
  itemImageUrls: string[];
  itemIds?: string[];
  stylePrompt: string;
  stylePreset?: string;
  visualStyle?: string;
  visualStylePrompt?: string;
  customPrompt?: string;
  title?: string;
}

/** AIルーム生成 (Edge Function呼び出し) */
export function useGenerateAiRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateInput): Promise<AiGeneratedRoom> => {
      const { data, error } = await supabase.functions.invoke("generate-ai-room", {
        body: input,
      });
      if (error) {
        const msg = (error as any)?.context?.responseText
          ? JSON.parse((error as any).context.responseText).error
          : error.message;
        throw new Error(msg || "生成に失敗しました");
      }
      if (!data?.room) throw new Error(data?.error || "生成に失敗しました");
      return data.room as AiGeneratedRoom;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-rooms", user?.id] });
      qc.invalidateQueries({ queryKey: ["ai-rooms-public"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["posts-paginated"] });
      qc.invalidateQueries({ queryKey: ["posts-for-item"] });
      toast.success("AIルームを生成し、投稿に反映しました！");
    },
    onError: (e) => {
      toast.error((e as Error).message || "生成に失敗しました");
    },
  });
}

/** 削除 */
export function useDeleteAiRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from("ai_generated_rooms")
        .delete()
        .eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-rooms", user?.id] });
      toast.success("削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });
}

/** 公開/非公開切り替え */
export function useToggleAiRoomPublic() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, isPublic }: { roomId: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("ai_generated_rooms")
        .update({ is_public: isPublic })
        .eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-rooms", user?.id] });
      qc.invalidateQueries({ queryKey: ["ai-rooms-public"] });
    },
  });
}
