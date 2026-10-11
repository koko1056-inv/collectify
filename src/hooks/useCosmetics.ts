import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { PointShopItem } from "@/hooks/usePointShop";
import type { OshiColor } from "@/lib/cosmetics";

/**
 * 着せ替え（ポイントで解放する見た目）の読み書き。
 *  - 解放済みかどうかは user_unlocks（本人だけが読める）
 *  - 売り物の一覧と値段は point_shop_items（item_type = 'unlock'）
 *  - 身に付けているものは profiles の列。持っていないものはサーバーのトリガーが弾く
 */

/** 自分が解放済みのキーの集合 */
export function useMyUnlocks() {
  const { user } = useAuth();
  const query = useQuery<string[]>({
    queryKey: ["userUnlocks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_unlocks")
        .select("unlock_key")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.unlock_key);
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
  const owned = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { ...query, owned };
}

/** 解放アイテム（値段つき）を unlock_key で引けるようにする */
export function useUnlockItems() {
  const query = useQuery<PointShopItem[]>({
    queryKey: ["pointShopItems", "unlock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_shop_items")
        .select("*")
        .eq("is_active", true)
        .eq("item_type", "unlock")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PointShopItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const byKey = useMemo(() => {
    const m = new Map<string, PointShopItem>();
    for (const it of query.data ?? []) if (it.unlock_key) m.set(it.unlock_key, it);
    return m;
  }, [query.data]);
  return { ...query, byKey };
}

export interface EquipInput {
  /** undefined は「変えない」、null は「外す（標準に戻す）」 */
  coverKey?: string | null;
  frameKey?: string | null;
  oshiColor?: OshiColor | null;
}

/** プロフィールに着せ替えを付ける（持っていないものはサーバーで弾かれる） */
export function useEquipCosmetic() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EquipInput) => {
      if (!user?.id) throw new Error("User not authenticated");
      const patch: {
        profile_cover_key?: string | null;
        avatar_frame_key?: string | null;
        profile_oshi_color?: string | null;
      } = {};
      if (input.coverKey !== undefined) patch.profile_cover_key = input.coverKey;
      if (input.frameKey !== undefined) patch.avatar_frame_key = input.frameKey;
      if (input.oshiColor !== undefined) patch.profile_oshi_color = input.oshiColor;
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: () => {
      toast.error(t("cosmetics.equipFailed"));
    },
  });
}
