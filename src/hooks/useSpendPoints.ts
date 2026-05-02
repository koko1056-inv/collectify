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

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("ログインが必要です");

      // サーバー側で残高検証 + ポイント減算 + 枠拡張 + 履歴記録を原子化
      const { error } = await supabase.rpc("expand_collection_slots", {
        _cost: 30,
        _slots_added: 10,
      });
      if (error) {
        if (error.message?.includes("Insufficient points")) {
          throw new Error("ポイントが不足しています（必要: 30pt）");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userLimits"] });
      qc.invalidateQueries({ queryKey: ["collectionCount"] });
      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
      toast.success("コレクション枠を +10 拡張しました ✨");
    },
    onError: (e) => {
      toast.error((e as Error).message || "枠拡張に失敗しました");
    },
  });
}
