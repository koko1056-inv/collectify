import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuickAddGoods } from "@/hooks/useQuickAddGoods";
import { usePreorders } from "@/hooks/usePreorders";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import type { OfficialItem } from "@/types";
import type { ReleaseItem } from "@/hooks/useOshiReleases";

/**
 * 推しの新商品の一覧（発売カレンダー・新着・「みんな」の発見の欄）で共通に使う操作。
 *  - ほしいものに入れる（すでに入っているものは塗りつぶしたハートで見せる）
 *  - 予約中のものは「予約中」の札で見せる（予約はグッズ詳細の「予約した」から）
 *  - タップで既存のグッズ詳細（ItemDetailsModal）を開く
 */
export function useReleaseActions() {
  const { user } = useAuth();
  const { wished, busyId, wish } = useQuickAddGoods();
  const preorders = usePreorders();
  const [opened, setOpened] = useState<ReleaseItem | null>(null);

  // すでにほしいものに入っているグッズ。id だけを軽く読む
  const { data: wishIds } = useQuery({
    queryKey: ["my-wish-ids", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlists").select("official_item_id").eq("user_id", user!.id).limit(1000);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.official_item_id).filter(Boolean) as string[]);
    },
  });

  const isWished = (id: string) => wished.has(id) || !!wishIds?.has(id);
  const isPreordered = (id: string) => !!preorders.get(id);
  const addWish = (item: ReleaseItem) =>
    void wish({ ...item, price: item.price ?? "", release_date: item.release_date ?? "" } as unknown as OfficialItem);

  const detail = opened ? (
    <ItemDetailsModal
      isOpen
      onClose={() => setOpened(null)}
      title={opened.title}
      image={opened.image}
      price={opened.price ?? undefined}
      releaseDate={opened.release_date ?? undefined}
      itemId={opened.id}
      contentName={opened.content_name}
    />
  ) : null;

  return { isWished, isPreordered, addWish, busyId, open: setOpened, detail, canWish: !!user };
}

export type ReleaseActions = ReturnType<typeof useReleaseActions>;

/** 発売日を「10/16」の形で */
export function shortDate(date: string | null | undefined): string {
  if (!date) return "";
  const [, m, d] = date.split("-");
  return m && d ? `${Number(m)}/${Number(d)}` : "";
}
