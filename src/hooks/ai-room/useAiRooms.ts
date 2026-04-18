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
      qc.invalidateQueries({ queryKey: ["item-posts"] });
      qc.invalidateQueries({ queryKey: ["user-item-posts"] });
      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
      toast.success("AIルームを生成しました！(-50pt)");
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

/** 公開/非公開切り替え (投稿への反映も同期) */
export function useToggleAiRoomPublic() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, isPublic }: { roomId: string; isPublic: boolean }) => {
      // ルーム情報取得
      const { data: room, error: roomErr } = await supabase
        .from("ai_generated_rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (roomErr) throw roomErr;
      if (!room) throw new Error("ルームが見つかりません");

      // is_public 更新
      const { error: updErr } = await supabase
        .from("ai_generated_rooms")
        .update({ is_public: isPublic })
        .eq("id", roomId);
      if (updErr) throw updErr;

      const captionParts: string[] = [];
      if (room.title) captionParts.push(room.title);
      captionParts.push("AIで作った推しルーム ✨");
      if (room.custom_prompt) captionParts.push(room.custom_prompt);
      const caption = captionParts.join("\n");
      const firstItemId =
        room.source_item_ids && room.source_item_ids.length > 0
          ? room.source_item_ids[0]
          : null;

      if (isPublic) {
        // 公開: 投稿が無ければ作成

        // goods_posts (user_item_id 必須なのでアイテムがある場合のみ)
        if (firstItemId) {
          const { data: existingGoods } = await supabase
            .from("goods_posts")
            .select("id")
            .eq("user_id", room.user_id)
            .eq("image_url", room.image_url)
            .maybeSingle();
          if (!existingGoods) {
            await supabase.from("goods_posts").insert({
              user_id: room.user_id,
              user_item_id: firstItemId,
              image_url: room.image_url,
              caption,
            });
          }
        }

        // item_posts (+ item_post_images)
        const { data: existingItemPost } = await supabase
          .from("item_posts")
          .select("id, item_post_images(image_url)")
          .eq("user_id", room.user_id)
          .eq("user_item_id", firstItemId)
          .order("created_at", { ascending: false })
          .limit(20);

        const alreadyPosted = (existingItemPost || []).some((p: any) =>
          (p.item_post_images || []).some(
            (img: any) => img.image_url === room.image_url
          )
        );

        if (!alreadyPosted) {
          const { data: newPost, error: ipErr } = await supabase
            .from("item_posts")
            .insert({
              user_id: room.user_id,
              user_item_id: firstItemId,
              caption,
            })
            .select()
            .single();
          if (!ipErr && newPost) {
            await supabase.from("item_post_images").insert({
              post_id: newPost.id,
              image_url: room.image_url,
              display_order: 0,
            });
          }
        }
      } else {
        // 非公開: 対応する投稿を削除

        // item_posts: 同じ image_url を持つものを検索して削除
        const { data: ipImgs } = await supabase
          .from("item_post_images")
          .select("post_id")
          .eq("image_url", room.image_url);
        const postIds = (ipImgs || []).map((r: any) => r.post_id);
        if (postIds.length > 0) {
          await supabase
            .from("item_posts")
            .delete()
            .in("id", postIds)
            .eq("user_id", room.user_id);
        }

        // goods_posts: 同じ image_url を削除
        await supabase
          .from("goods_posts")
          .delete()
          .eq("user_id", room.user_id)
          .eq("image_url", room.image_url);
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ai-rooms", user?.id] });
      qc.invalidateQueries({ queryKey: ["ai-rooms-public"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["posts-paginated"] });
      qc.invalidateQueries({ queryKey: ["posts-for-item"] });
      qc.invalidateQueries({ queryKey: ["item-posts"] });
      qc.invalidateQueries({ queryKey: ["user-item-posts"] });
      toast.success(
        variables.isPublic
          ? "公開しました。投稿にも反映されます ✨"
          : "非公開にしました。投稿からも削除しました"
      );
    },
    onError: (e) => {
      toast.error((e as Error).message || "更新に失敗しました");
    },
  });
}
