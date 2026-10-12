import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

type Snapshot = Array<[readonly unknown[], unknown]>;

/** 一覧（["user-items", ...]）と詳細（["user-item-details", id]）の for_trade を書き換える */
function patchCaches(qc: QueryClient, itemId: string, forTrade: boolean) {
  qc.setQueriesData({ queryKey: ["user-items"] }, (old: unknown) =>
    Array.isArray(old)
      ? old.map((row) => (row && row.id === itemId ? { ...row, for_trade: forTrade } : row))
      : old,
  );
  qc.setQueryData(["user-item-details", itemId], (old: unknown) =>
    old && typeof old === "object" ? { ...(old as object), for_trade: forTrade } : old,
  );
}

/**
 * グッズを「交換に出す／下げる」の切り替え。
 *
 * コレクションのカードとグッズ詳細の両方から使うので、更新・キャッシュ・トーストをここにまとめる。
 * カードではタップした瞬間に写真左上の「交換」バッジまで変わってほしいので、楽観的に書き換え、
 * 失敗したら元に戻す。交換の候補や「はじめてガイド」の進み具合は出しているグッズで決まるため、
 * 成功したらそれらも引き直す。
 */
export function useToggleForTrade() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ itemId, forTrade }: { itemId: string; forTrade: boolean }) => {
      const { error } = await supabase.from("user_items").update({ for_trade: forTrade }).eq("id", itemId);
      if (error) throw error;
    },
    onMutate: async ({ itemId, forTrade }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["user-items"] }),
        qc.cancelQueries({ queryKey: ["user-item-details", itemId] }),
      ]);
      const snapshot: Snapshot = [
        ...qc.getQueriesData({ queryKey: ["user-items"] }),
        ...qc.getQueriesData({ queryKey: ["user-item-details", itemId] }),
      ];
      patchCaches(qc, itemId, forTrade);
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      console.error("Failed to update trade availability:", error);
      context?.snapshot.forEach(([key, data]) => qc.setQueryData<unknown>(key, data));
      toast.error(t("itemDetails.trade.saveFailed"));
    },
    onSuccess: (_data, { forTrade }) => {
      toast.success(forTrade ? t("itemDetails.trade.enabled") : t("itemDetails.trade.disabled"), {
        description: forTrade ? t("itemDetails.trade.enabledDesc") : undefined,
      });
    },
    onSettled: (_data, _error, { itemId }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["user-item-details", itemId] }),
        qc.invalidateQueries({ queryKey: ["user-items"] }),
        qc.invalidateQueries({ queryKey: ["trade-matches", user?.id] }),
        qc.invalidateQueries({ queryKey: ["trade-readiness", user?.id] }),
        qc.invalidateQueries({ queryKey: ["trade-series-partners", user?.id] }),
        qc.invalidateQueries({ queryKey: ["my-trade-offers", user?.id] }),
        // 「はじめてガイド」の交換ステップは、出しているグッズの有無で完了になる
        qc.invalidateQueries({ queryKey: ["onboarding-checklist", user?.id] }),
      ]),
  });
}
