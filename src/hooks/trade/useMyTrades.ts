import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TradeRequest } from "@/components/trade/types";

const TRADE_SELECT = `
  id,
  message,
  status,
  shipping_status,
  is_open,
  created_at,
  sender_shipped_at,
  receiver_shipped_at,
  sender_received_at,
  receiver_received_at,
  completed_at,
  cancelled_at,
  cancelled_by,
  sender:profiles!trade_requests_sender_id_fkey(id, username, display_name, avatar_url),
  receiver:profiles!trade_requests_receiver_id_fkey(id, username, display_name, avatar_url),
  offered_item:user_items!trade_requests_offered_item_id_fkey(id, title, image),
  requested_item:user_items!trade_requests_requested_item_id_fkey(id, title, image)
`;

/**
 * 自分が関わる取引をまとめて取る。
 *
 * 以前は「申請中」「進行中」「完了」で同じクエリを3回書いていて、
 * 片方だけ列を足し忘れると画面ごとに挙動が違ってしまっていた。
 * 1回引いてから状態で仕分ける。
 */
export function useMyTrades(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["my-trades", user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<TradeRequest[]> => {
      const { data, error } = await supabase
        .from("trade_requests")
        .select(TRADE_SELECT)
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as TradeRequest[];
    },
  });

  // 相手が承認や発送を報告したら、こちらの画面もそのまま追いつくようにする
  useEffect(() => {
    if (!user?.id || !enabled) return;
    const channel = supabase
      .channel(`my-trades-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-trades", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, enabled, queryClient]);

  const groups = useMemo(() => {
    // 旧「オープントレード」は receiver_id に自分自身を入れて作られていた。
    // 相手がいないので進めようがなく、届いた申請と送った申請の両方に
    // 出てきてしまうため、一覧からは外す。
    const all = (query.data ?? []).filter((t) => t.sender?.id !== t.receiver?.id);
    return {
      /** 自分あてに届いていて、まだ返事をしていないもの */
      incoming: all.filter((t) => t.status === "pending" && t.receiver?.id === user?.id),
      /** 自分が申し込んで返事待ちのもの */
      outgoing: all.filter((t) => t.status === "pending" && t.sender?.id === user?.id),
      /** 承認済みで進行中のもの */
      active: all.filter((t) => t.status === "accepted"),
      /** 終わったもの（完了・辞退・取消） */
      finished: all.filter((t) =>
        ["completed", "rejected", "cancelled"].includes(t.status)
      ),
    };
  }, [query.data, user?.id]);

  return { ...query, ...groups };
}

/** 取引に関わる表示をまとめて更新する */
export function invalidateTrades(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | undefined
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["my-trades", userId] }),
    queryClient.invalidateQueries({ queryKey: ["trade-matches", userId] }),
    queryClient.invalidateQueries({ queryKey: ["pending-trade-count", userId] }),
  ]);
}
