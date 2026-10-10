import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** 自分宛ての未読メッセージ数。新しいメッセージが届いたら数え直す */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelId = useId();
  const queryKey = ["unread-messages", user?.id];

  const { data = 0 } = useQuery({
    queryKey,
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`unread-messages-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["unread-messages", user.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, channelId, queryClient]);

  return data;
}
