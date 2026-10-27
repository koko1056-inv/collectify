import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG_ACCOUNT_ID } from "@/constants/catalog";

export interface ItemCreatorProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * グッズを登録した人のプロフィール。
 * 登録者が空（NULL）か、プロフィールが見つからない（退会済み）ときは、カタログのアカウント（koko）を返す。
 * 「管理者」のような名前のない表示にはしない。
 */
export function useItemCreatorProfile(
  createdBy: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["creator-profile", createdBy ?? null],
    queryFn: async (): Promise<ItemCreatorProfile | null> => {
      const ids = createdBy && createdBy !== CATALOG_ACCOUNT_ID
        ? [createdBy, CATALOG_ACCOUNT_ID]
        : [CATALOG_ACCOUNT_ID];
      for (const id of ids) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (data) return data;
      }
      return null;
    },
    enabled: options.enabled ?? true,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });
}
