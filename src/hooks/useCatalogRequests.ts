import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CatalogRequestKind = "content" | "goods";
export type CatalogRequestContext = "starter" | "guest_starter" | "search" | "interests";

export interface CatalogRequestInput {
  query: string;
  kind?: CatalogRequestKind;
  context?: CatalogRequestContext;
}

/**
 * 「この推し（作品・グッズ）を追加してほしい」の送信。
 * ログイン済みなら自分のuser_idで、未ログインならuser_id nullで送る（どちらもDB側のRLSが許す形）。
 */
export function useSubmitCatalogRequest() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CatalogRequestInput) => {
      const query = input.query.trim().slice(0, 100);
      if (!query) throw new Error("empty_query");
      const { error } = await supabase.from("catalog_requests").insert({
        user_id: user?.id ?? null,
        query,
        kind: input.kind ?? "content",
        context: input.context ?? null,
      });
      if (error) throw error;
    },
  });
}

export interface CatalogRequestRankingRow {
  query_norm: string;
  sample_query: string;
  request_count: number;
  unique_user_count: number;
  last_requested_at: string;
}
