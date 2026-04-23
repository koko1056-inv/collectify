import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Options {
  /** 過去履歴を確認する point_transactions の transaction_type 群 */
  transactionTypes: string[];
  /**
   * 追加で「既にレコードがあれば使用済み」と判定したいテーブル名。
   * 例: avatar_gallery / ai_generated_rooms
   */
  extraTable?: "avatar_gallery" | "ai_generated_rooms";
}

/**
 * Edge Function 側の「初回無料」判定をフロント側でも事前に表示するためのフック。
 * 結果は60秒キャッシュ。確実な判定は Edge Function 側で行うため、これは UI 表示用。
 */
export function useFirstTimeFree({ transactionTypes, extraTable }: Options) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["firstTimeFree", user?.id, transactionTypes.join(","), extraTable ?? ""],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;

      const { count: txCount } = await supabase
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("transaction_type", transactionTypes);

      if ((txCount ?? 0) > 0) return false;

      if (extraTable) {
        const { count: extraCount } = await supabase
          .from(extraTable)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if ((extraCount ?? 0) > 0) return false;
      }

      return true;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
