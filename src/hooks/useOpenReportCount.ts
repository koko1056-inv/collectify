import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * 未対応・確認中の通報の件数（管理者向け）。
 * 通報は 24 時間以内に対応する運用なので、管理画面のタブにバッジで出す。
 * RLS により、管理者以外が呼んでも自分の通報の分しか数えられない。
 */
export function useOpenReportCount(enabled = true) {
  return useQuery({
    queryKey: ["admin-open-report-count"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("user_reports")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "reviewing"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
