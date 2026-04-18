import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SpendPointsParams {
  cost: number;
  transactionType: string;
  description: string;
  referenceId?: string;
}

/**
 * ポイントを消費する汎用フック。
 * 残高チェック → add_user_points(負値) でアトミックに消費。
 * UI 側は事前に確認ダイアログを表示し、確定後にこの mutation を呼ぶ。
 */
export function useSpendPoints() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ cost, transactionType, description, referenceId }: SpendPointsParams) => {
      if (!user?.id) throw new Error("ログインが必要です");
      if (cost <= 0) return { newBalance: 0 };

      const { data: row, error: balErr } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();
      if (balErr) throw balErr;

      const balance = row?.total_points ?? 0;
      if (balance < cost) {
        throw new Error(`ポイントが不足しています（必要: ${cost}pt / 現在: ${balance}pt）`);
      }

      const { error: rpcErr } = await supabase.rpc("add_user_points", {
        _user_id: user.id,
        _points: -cost,
        _transaction_type: transactionType,
        _description: description,
        _reference_id: referenceId,
      });
      if (rpcErr) throw rpcErr;

      return { newBalance: balance - cost };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
    },
    onError: (e) => {
      toast.error((e as Error).message || "ポイント消費に失敗しました");
    },
  });
}

/** コレクション枠を +10 拡張 (30pt) */
export function useExpandCollectionSlots() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const spend = useSpendPoints();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("ログインが必要です");
      const COST = 30;
      const SLOTS_ADDED = 10;

      // ポイント消費
      await spend.mutateAsync({
        cost: COST,
        transactionType: "collection_slot_expand",
        description: `コレクション枠 +${SLOTS_ADDED} 拡張`,
      });

      // user_limits を upsert
      const { data: existing } = await supabase
        .from("user_limits")
        .select("collection_slots")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_limits")
          .update({ collection_slots: (existing.collection_slots ?? 100) + SLOTS_ADDED })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_limits")
          .insert({ user_id: user.id, collection_slots: 100 + SLOTS_ADDED });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userLimits"] });
      qc.invalidateQueries({ queryKey: ["collectionCount"] });
      toast.success("コレクション枠を +10 拡張しました ✨");
    },
  });
}
