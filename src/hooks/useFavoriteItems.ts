import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FAVORITE_ITEMS_LIMIT = 5;

export interface FavoriteItem {
  id: string;
  title: string;
  image: string;
  content_name: string | null;
}

/**
 * ユーザーのお気に入りグッズ（最大5個）を、profiles.favorite_item_ids の順番を保ったまま返す。
 * 削除済みのアイテムIDは表示から除外される。
 */
export function useFavoriteItems(userId?: string | null) {
  return useQuery({
    queryKey: ["favorite-items", userId],
    queryFn: async (): Promise<FavoriteItem[]> => {
      if (!userId) return [];

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("favorite_item_ids")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;

      const ids = (profile?.favorite_item_ids || []) as string[];
      if (ids.length === 0) return [];

      const { data: items, error: itemsError } = await supabase
        .from("user_items")
        .select("id, title, image, content_name")
        .in("id", ids);
      if (itemsError) throw itemsError;

      // 配列順を保つ
      const map = new Map(items?.map((i) => [i.id, i]) || []);
      return ids
        .map((id) => map.get(id))
        .filter(Boolean)
        .map((i) => ({
          id: i!.id,
          title: i!.title,
          image: i!.image,
          content_name: i!.content_name,
        }));
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useUpdateFavoriteItems(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newIds: string[]) => {
      if (!userId) throw new Error("Not authenticated");
      const trimmed = newIds.slice(0, FAVORITE_ITEMS_LIMIT);
      const { error } = await supabase
        .from("profiles")
        .update({ favorite_item_ids: trimmed })
        .eq("id", userId);
      if (error) throw error;
      return trimmed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-items", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("お気に入りを更新しました");
    },
    onError: (err) => {
      console.error(err);
      toast.error("お気に入りの更新に失敗しました");
    },
  });
}
