import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FloatingReaction {
  id: string;
  emoji: string;
  userId: string;
  startX: number; // 0-1 horizontal position
  createdAt: number;
}

export const REACTION_EMOJIS = [
  "❤️", "😍", "🔥", "✨", "🎉", "👏", "😭", "🫶", "💎", "👑",
];

export function useRoomReactions(roomId: string | undefined) {
  const { user } = useAuth();
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Realtime subscription to new reactions
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room_reactions:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_reactions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const r = payload.new as any;
          const newReaction: FloatingReaction = {
            id: r.id,
            emoji: r.emoji,
            userId: r.user_id,
            startX: Math.random(),
            createdAt: Date.now(),
          };
          setFloatingReactions((prev) => [...prev, newReaction]);
          // Auto-cleanup after 4 seconds
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((x) => x.id !== newReaction.id));
          }, 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Send a reaction
  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!roomId || !user?.id) {
        toast.error("リアクションを送るにはログインが必要です");
        return;
      }
      try {
        await supabase
          .from("room_reactions")
          .insert({ room_id: roomId, user_id: user.id, emoji });
      } catch (e) {
        console.error(e);
      }
    },
    [roomId, user?.id]
  );

  return { floatingReactions, sendReaction };
}
