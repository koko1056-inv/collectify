import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ItemRoom, ItemRoomMessage } from "./types";

/**
 * グッズに対応するルームを取得 or 作成。
 * 「アイテム所有 or wishlist登録」していないユーザーはエラー（access denied）。
 */
export function useItemRoom(officialItemId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["item-room", officialItemId, user?.id],
    queryFn: async (): Promise<{ room: ItemRoom | null; canAccess: boolean }> => {
      if (!officialItemId || !user) return { room: null, canAccess: false };

      // アクセス可否を確認
      const { data: canAccess } = await supabase.rpc("can_access_item_room", {
        _user: user.id,
        _official_item_id: officialItemId,
      });

      if (!canAccess) return { room: null, canAccess: false };

      // ルーム取得 or 作成
      const { data: roomId, error } = await supabase.rpc("get_or_create_item_room", {
        _official_item_id: officialItemId,
      });
      if (error) throw error;

      const { data: room } = await supabase
        .from("item_rooms")
        .select("*")
        .eq("id", roomId as string)
        .single();

      return { room: room as ItemRoom, canAccess: true };
    },
    enabled: !!officialItemId && !!user,
  });
}

/** ルーム内のメッセージ一覧 */
export function useItemRoomMessages(roomId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["item-room-messages", roomId],
    queryFn: async (): Promise<ItemRoomMessage[]> => {
      if (!roomId) return [];
      const { data, error } = await supabase
        .from("item_room_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      const messages = (data || []) as ItemRoomMessage[];
      const userIds = Array.from(new Set(messages.map((m) => m.user_id)));
      if (userIds.length === 0) return messages;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const map = new Map((profiles || []).map((p) => [p.id, p]));
      return messages.map((m) => ({ ...m, sender: map.get(m.user_id) ?? null }));
    },
    enabled: !!roomId,
  });

  // Realtime購読
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`item-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "item_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["item-room-messages", roomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return query;
}

/** メッセージ投稿 */
export function useSendItemRoomMessage(roomId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!roomId || !user) throw new Error("Not ready");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("メッセージを入力してください");

      const { error } = await supabase.from("item_room_messages").insert({
        room_id: roomId,
        user_id: user.id,
        content: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-room-messages", roomId] });
    },
    onError: (e) => {
      toast.error((e as Error).message || "送信に失敗しました");
    },
  });
}

/** メッセージ削除（自分のみ） */
export function useDeleteItemRoomMessage(roomId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("item_room_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-room-messages", roomId] });
      toast.success("削除しました");
    },
    onError: (e) => toast.error((e as Error).message || "削除に失敗しました"),
  });
}
