import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MyRoom {
  id: string;
  user_id: string;
  title: string;
  background_image: string | null;
  background_color: string | null;
  is_main_room: boolean;
  is_public: boolean;
  visit_count: number;
  binder_type: string;
  layout_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RoomItem {
  id: string;
  binder_page_id: string;
  user_item_id: string | null;
  official_item_id: string | null;
  custom_image_url: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  item_data?: {
    id: string;
    title: string;
    image: string;
  };
}

export function useMyRoom(userId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  // メインルームを取得
  const { data: mainRoom, isLoading: isLoadingRoom } = useQuery({
    queryKey: ["main-room", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("binder_pages")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("is_main_room", true)
        .maybeSingle();

      if (error) throw error;
      return data as MyRoom | null;
    },
    enabled: !!targetUserId,
  });

  // ルームのアイテムを取得
  const { data: roomItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["room-items", mainRoom?.id],
    queryFn: async () => {
      if (!mainRoom?.id) return [];

      const { data: binderItems, error } = await supabase
        .from("binder_items")
        .select("*")
        .eq("binder_page_id", mainRoom.id)
        .order("z_index", { ascending: true });

      if (error) throw error;

      // アイテムの詳細情報を取得
      const itemsWithData = await Promise.all(
        (binderItems || []).map(async (item) => {
          let itemData = null;
          
          if (item.user_item_id) {
            const { data } = await supabase
              .from("user_items")
              .select("id, title, image")
              .eq("id", item.user_item_id)
              .maybeSingle();
            itemData = data;
          } else if (item.official_item_id) {
            const { data } = await supabase
              .from("official_items")
              .select("id, title, image")
              .eq("id", item.official_item_id)
              .maybeSingle();
            itemData = data;
          }

          return { ...item, item_data: itemData } as RoomItem;
        })
      );

      return itemsWithData;
    },
    enabled: !!mainRoom?.id,
  });

  // いいね数を取得
  const { data: likeCount = 0 } = useQuery({
    queryKey: ["room-likes-count", mainRoom?.id],
    queryFn: async () => {
      if (!mainRoom?.id) return 0;

      const { count, error } = await supabase
        .from("room_likes")
        .select("*", { count: "exact", head: true })
        .eq("room_id", mainRoom.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!mainRoom?.id,
  });

  // 自分がいいねしているか
  const { data: isLiked = false } = useQuery({
    queryKey: ["room-is-liked", mainRoom?.id, user?.id],
    queryFn: async () => {
      if (!mainRoom?.id || !user?.id) return false;

      const { data, error } = await supabase
        .from("room_likes")
        .select("id")
        .eq("room_id", mainRoom.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!mainRoom?.id && !!user?.id,
  });

  // メインルームを作成
  const createMainRoom = useMutation({
    mutationFn: async (title: string = "マイルーム") => {
      if (!user?.id) throw new Error("ログインが必要です");

      const { data, error } = await supabase
        .from("binder_pages")
        .insert({
          user_id: user.id,
          title,
          is_main_room: true,
          binder_type: "free_layout",
          layout_config: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["main-room", user?.id] });
      toast.success("マイルームを作成しました！");
    },
    onError: (error) => {
      console.error("Error creating main room:", error);
      toast.error("マイルームの作成に失敗しました");
    },
  });

  // いいね切り替え
  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!mainRoom?.id || !user?.id) throw new Error("ログインが必要です");

      if (isLiked) {
        const { error } = await supabase
          .from("room_likes")
          .delete()
          .eq("room_id", mainRoom.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("room_likes")
          .insert({
            room_id: mainRoom.id,
            user_id: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-likes-count", mainRoom?.id] });
      queryClient.invalidateQueries({ queryKey: ["room-is-liked", mainRoom?.id, user?.id] });
    },
  });

  // 訪問を記録
  const recordVisit = useMutation({
    mutationFn: async () => {
      if (!mainRoom?.id || !user?.id) return;
      // 自分の部屋は訪問カウントしない
      if (mainRoom.user_id === user.id) return;

      try {
        await supabase
          .from("room_visits")
          .insert({
            room_id: mainRoom.id,
            visitor_id: user.id,
          });
      } catch {
        // 同日の重複訪問はエラーになるが無視
      }
    },
  });

  return {
    mainRoom,
    roomItems,
    likeCount,
    isLiked,
    isLoading: isLoadingRoom || isLoadingItems,
    createMainRoom,
    toggleLike,
    recordVisit,
    isOwnRoom: mainRoom?.user_id === user?.id,
  };
}
