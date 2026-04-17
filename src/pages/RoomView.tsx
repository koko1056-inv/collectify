import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShelfView } from "@/components/room2d/ShelfView";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Heart, Eye, Share2, UserPlus, Camera, Music, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomItem } from "@/hooks/useMyRoom";
import { useRoomFurniture } from "@/hooks/useRoomFurniture";
import { useRoomScreenshot } from "@/hooks/useRoomScreenshot";
import { useRoomReactions } from "@/hooks/useRoomReactions";
import { useRoomBgm } from "@/hooks/useRoomBgm";
import { FloatingReactions } from "@/components/room3d/FloatingReactions";
import { ReactionPicker } from "@/components/room3d/ReactionPicker";
import { toast } from "sonner";
import { trackRoomView, trackRoomShare } from "@/utils/analytics";

export default function RoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { furniture } = useRoomFurniture(roomId);
  const { shareScreenshot } = useRoomScreenshot();
  const { floatingReactions, sendReaction } = useRoomReactions(roomId);
  const [bgmEnabled, setBgmEnabled] = useState(false);


  // ルーム情報を取得
  const { data: room, isLoading: loadingRoom } = useQuery({
    queryKey: ["room-view", roomId],
    queryFn: async () => {
      if (!roomId) return null;

      const { data, error } = await supabase
        .from("binder_pages")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  // ルームのオーナープロフィール
  const { data: ownerProfile } = useQuery({
    queryKey: ["room-owner-profile", room?.user_id],
    queryFn: async () => {
      if (!room?.user_id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", room.user_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!room?.user_id,
  });

  // ルームのアイテムを取得
  const { data: roomItems = [] } = useQuery({
    queryKey: ["room-view-items", roomId],
    queryFn: async () => {
      if (!roomId) return [];

      const { data: binderItems, error } = await supabase
        .from("binder_items")
        .select("*")
        .eq("binder_page_id", roomId)
        .order("z_index", { ascending: true });

      if (error) throw error;

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
    enabled: !!roomId,
  });

  // いいね数を取得
  const { data: likeCount = 0 } = useQuery({
    queryKey: ["room-view-likes", roomId],
    queryFn: async () => {
      if (!roomId) return 0;

      const { count, error } = await supabase
        .from("room_likes")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!roomId,
  });

  // 自分がいいねしているか
  const { data: isLiked = false, refetch: refetchLiked } = useQuery({
    queryKey: ["room-view-is-liked", roomId, user?.id],
    queryFn: async () => {
      if (!roomId || !user?.id) return false;

      const { data, error } = await supabase
        .from("room_likes")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!roomId && !!user?.id,
  });

  // 訪問を記録（一時的に簡素化）
  const visitRecorded = useRef(false);
  useEffect(() => {
    if (!room || !roomId || visitRecorded.current) return;
    visitRecorded.current = true;

    // Analytics
    try {
      trackRoomView(roomId, room.user_id, user?.id);
    } catch (e) {
      console.error("analytics error:", e);
    }

    // visit_count をアトミックにインクリメント
    supabase.rpc("increment_visit_count", { page_id: roomId }).then(() => {
      // success
    }, (err) => {
      console.warn("increment_visit_count failed:", err);
    });

    // room_visits テーブルに記録（自分以外、ログイン時のみ）
    if (user && room.user_id !== user.id) {
      supabase
        .from("room_visits")
        .insert({ room_id: roomId, visitor_id: user.id })
        .then(() => {}, (err) => {
          console.warn("record visit failed:", err);
        });
    }
  }, [room, roomId, user]);

  const handleToggleLike = async () => {
    if (!roomId || !user?.id) return;

    try {
      if (isLiked) {
        await supabase
          .from("room_likes")
          .delete()
          .eq("room_id", roomId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("room_likes")
          .insert({ room_id: roomId, user_id: user.id });
      }
      refetchLiked();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("いいねの更新に失敗しました");
    }
  };

  // BGM
  const themeId = room?.background_color?.startsWith("theme:")
    ? room.background_color.slice("theme:".length)
    : undefined;
  const { isPlaying, togglePlay, hasBgm } = useRoomBgm({
    themeId,
    bgmPreset: room?.bgm_preset,
    bgmUrl: room?.bgm_url,
    volume: room?.bgm_volume ?? 0.3,
    enabled: bgmEnabled,
  });

  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-lg mb-4">ルームが見つかりません</p>
          <Button onClick={() => navigate(-1)}>戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f23] relative">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            {/* BGM toggle */}
            {hasBgm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setBgmEnabled((v) => !v);
                  setTimeout(togglePlay, 100);
                }}
                className={cn(
                  "text-white hover:bg-white/10",
                  bgmEnabled && isPlaying && "bg-white/20"
                )}
                title={bgmEnabled ? "BGMオフ" : "BGMオン"}
              >
                {bgmEnabled && isPlaying ? (
                  <Music className="w-5 h-5" />
                ) : (
                  <Music2 className="w-5 h-5" />
                )}
              </Button>
            )}
            {/* Emoji reactions */}
            <ReactionPicker onSend={sendReaction} disabled={!user} />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleLike}
              className="text-white hover:bg-white/10"
              disabled={!user || room.user_id === user?.id}
            >
              <Heart className={cn("w-5 h-5", isLiked && "fill-current text-red-400")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                trackRoomShare(roomId!, room.title, user?.id);
                shareScreenshot(room.title);
              }}
              className="text-white hover:bg-white/10"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2Dシェルフビュー */}
      <div className="h-screen relative">
        <ShelfView
          roomItems={roomItems}
          roomFurniture={furniture}
          backgroundImage={room.background_image}
          backgroundColor={room.background_color}
          roomTitle={room.title}
          avatarUrl={ownerProfile?.avatar_url}
        />
        <FloatingReactions reactions={floatingReactions} />
      </div>

      {/* フッター - オーナー情報 */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/user/${room.user_id}`)}
            className="flex items-center gap-3 group"
          >
            <Avatar className="w-12 h-12 border-2 border-purple-500">
              <AvatarImage src={ownerProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-purple-900 text-white">
                {ownerProfile?.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-white font-medium group-hover:text-purple-400 transition-colors">
                {ownerProfile?.display_name || ownerProfile?.username}
              </p>
              <p className="text-white/50 text-sm">@{ownerProfile?.username}</p>
            </div>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-white/70 text-sm flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {room.visit_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {likeCount}
              </span>
            </div>

            {user && room.user_id !== user.id && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                フォロー
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
