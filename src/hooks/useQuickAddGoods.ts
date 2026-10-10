import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { addToCollection } from "@/utils/collection-actions";
import type { OfficialItem } from "@/types";
import { invalidateCollectionChanged } from "@/utils/collection-cache";

/**
 * カタログのグッズを、タップで「持ってる」「ほしい」に入れる。
 * ウェルカムの「はじめの1コレ」と、ホームの「推しの新着」で同じ動きを共有する。
 */
export function useQuickAddGoods() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [wished, setWished] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const add = useCallback(
    async (item: OfficialItem) => {
      if (!user || added.has(item.id)) return false;
      setBusyId(item.id);
      try {
        const result = await addToCollection({
          userId: user.id,
          title: item.title,
          image: item.image,
          officialItemId: item.id,
          contentName: item.content_name || undefined,
          releaseDate: item.release_date,
          prize: item.price,
        });
        if (!result.success) {
          if (result.isAtLimit) {
            toast.error(t("collectionScreen.addFlow.limitTitle"), {
              description: t("notices.adminItem.limitDesc", { max: result.maxSlots ?? 0 }),
            });
          } else {
            console.error("addToCollection failed:", result.error);
            toast.error(t("misc.onboarding.starter.addFailed"));
          }
          return false;
        }
        setAdded((prev) => new Set(prev).add(item.id));
        // コンプ進捗・登録数など、コレクションから計算している数字をまとめて引き直す（以前は進捗が漏れていた）
        void invalidateCollectionChanged(queryClient, { userId: user.id, officialItemId: item.id });
        return true;
      } finally {
        setBusyId(null);
      }
    },
    [user, added, queryClient, t]
  );

  const wish = useCallback(
    async (item: OfficialItem) => {
      if (!user || wished.has(item.id)) return false;
      setBusyId(item.id);
      try {
        const { error } = await supabase.from("wishlists").insert({ user_id: user.id, official_item_id: item.id });
        if (error) throw error;
        setWished((prev) => new Set(prev).add(item.id));
        void queryClient.invalidateQueries({ queryKey: ["wishlist"], refetchType: "all" });
        void queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", user.id] });
        return true;
      } catch (e) {
        console.error("Failed to add to wishlist:", e);
        toast.error(t("misc.onboarding.starter.addFailed"));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [user, wished, queryClient, t]
  );

  return { added, wished, busyId, add, wish };
}
