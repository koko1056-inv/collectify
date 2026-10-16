import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 手放したグッズ（past_items。本人だけが読む）。
 * 交換の成立時はサーバーが、自分で「手放した」を選んで外したときはアプリが記録する。
 */

export type PastReason = "trade" | "sold" | "gift" | "other";

export interface PastItem {
  id: string;
  officialItemId: string | null;
  title: string;
  image: string | null;
  contentName: string | null;
  quantity: number;
  reason: PastReason;
  releasedAt: string;
  purchasePrice: string | null;
  purchaseDate: string | null;
}

/** 手放した日（日本時間）を YYYY/MM/DD で */
export function pastDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "/");
}

export const pastItemsKey = (userId: string | null | undefined) => ["past-items", userId] as const;

export function usePastItems() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: pastItemsKey(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<PastItem[]> => {
      const { data, error } = await supabase
        .from("past_items")
        .select("id, official_item_id, title, image, content_name, quantity, reason, released_at, purchase_price, purchase_date")
        .eq("user_id", userId as string)
        .order("released_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        officialItemId: r.official_item_id,
        title: r.title,
        image: r.image,
        contentName: r.content_name,
        quantity: r.quantity,
        reason: (["trade", "sold", "gift", "other"].includes(r.reason) ? r.reason : "other") as PastReason,
        releasedAt: r.released_at,
        purchasePrice: r.purchase_price,
        purchaseDate: r.purchase_date,
      }));
    },
  });

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("past_items").delete().eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: pastItemsKey(userId) });
    },
    [queryClient, userId]
  );

  return {
    pastItems: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    remove,
    /** その公式グッズを以前持っていたか（いちばん新しい記録） */
    lastFor: (officialItemId: string) => (query.data ?? []).find((p) => p.officialItemId === officialItemId),
  };
}
