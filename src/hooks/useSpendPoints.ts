import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * 汎用の useSpendPoints は削除した。
 *
 * 「残高を読む → add_user_points(-cost) を呼ぶ」という形だったため、
 * 同時実行で二重消費が起き、消費額もクライアント側が決めていた。
 * 消費は用途ごとの専用RPC（残高確認と反映を FOR UPDATE 付きで原子化）に統一している:
 *
 *   - カスタムタグ発行      → create_custom_tag
 *   - ショップ購入          → purchase_shop_item
 *   - コレクション枠の拡張  → expand_collection_slots（下記）
 *   - チャレンジ作成        → create_challenge
 */

/** コレクション枠を +10 拡張 (30pt)。金額と枠数はサーバー側の定数。 */
export function useExpandCollectionSlots() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(t("notices.common.loginRequired"));

      // サーバー側で残高検証 + ポイント減算 + 枠拡張 + 履歴記録を原子化
      const { error } = await supabase.rpc("expand_collection_slots", {
        _cost: 30,
        _slots_added: 10,
      });
      if (error) {
        if (error.message?.includes("Insufficient points")) {
          throw new Error(t("notices.points.insufficient30"));
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userLimits"] });
      qc.invalidateQueries({ queryKey: ["collectionCount"] });
      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
      toast.success(t("notices.collection.slotsExpanded"));
    },
    onError: (e) => {
      toast.error((e as Error).message || t("notices.collection.slotsExpandFailed"));
    },
  });
}
