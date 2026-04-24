import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { StampType, StampContext } from "./types";

interface SendStampParams {
  receiverId: string;
  stampType: StampType;
  contextType?: StampContext;
  contextId?: string | null;
}

export function useSendStamp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId, stampType, contextType, contextId }: SendStampParams) => {
      if (!user) throw new Error("ログインが必要です");
      if (user.id === receiverId) throw new Error("自分には送れません");

      const { data, error } = await supabase
        .from("greeting_stamps")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          stamp_type: stampType,
          context_type: contextType ?? null,
          context_id: contextId ?? null,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "42501" || /violates row-level security/i.test(error.message)) {
          throw new Error("24時間以内に既にスタンプを送っています");
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["received-stamps"] });
      queryClient.invalidateQueries({ queryKey: ["sent-stamps", user?.id, vars.receiverId] });
      toast({ title: "スタンプを送りました", description: "相手の通知に届きます" });
    },
    onError: (e: Error) => {
      toast({ title: "送信できませんでした", description: e.message, variant: "destructive" });
    },
  });
}

/**
 * 直近24h以内に同じ相手にスタンプを送ったか
 */
export function useRecentStampSent(receiverId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sent-stamps", user?.id, receiverId],
    queryFn: async () => {
      if (!user || !receiverId) return false;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("greeting_stamps")
        .select("id")
        .eq("sender_id", user.id)
        .eq("receiver_id", receiverId)
        .gte("created_at", since)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user && !!receiverId,
    staleTime: 1000 * 30,
  });
}

export function useReplyStamp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stampId: string) => {
      const { error } = await supabase
        .from("greeting_stamps")
        .update({ replied_at: new Date().toISOString() })
        .eq("id", stampId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["received-stamps"] });
    },
  });
}
