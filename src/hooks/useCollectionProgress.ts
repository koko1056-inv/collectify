import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeriesProgress {
  series_label: string;
  owned: number;
  total: number;
  last_added_at: string | null;
  cover_image: string | null;
}

/**
 * コンプ進捗のクエリキー。
 * ["user-items", ...] で始めておくと、グッズの追加・削除のたびに各所で行っている
 * invalidateQueries(["user-items"]) で一緒に引き直される（useUniverseItems と同じ考え方）。
 * 以前は ["collection-progress", userId] という独立したキーで、削除側のどこからも引き直されず、
 * 「一度登録して削除してもコンプ進捗が変わらない」状態になっていた。
 */
export const collectionProgressKey = (userId: string | null | undefined) =>
  ["user-items", "collection-progress", userId] as const;

/**
 * 作品ごとの「持っている数 / カタログ総数」。
 * 閲覧権限（公開設定・フォロー）はDB側の can_view_collection で判定するので、
 * 見せてはいけない相手のときは空配列が返る。
 */
export function useCollectionProgress(userId: string | null | undefined) {
  return useQuery({
    queryKey: collectionProgressKey(userId),
    queryFn: async (): Promise<SeriesProgress[]> => {
      const { data, error } = await supabase.rpc("get_collection_progress", {
        _user_id: userId as string,
      });
      if (error) throw error;
      return (data ?? []) as SeriesProgress[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    // アプリ全体の既定は refetchOnMount: false。画面に出ていない間に invalidate（stale 化）された
    // 進捗も、次にコレクションを開いたときに引き直されるようにする。
    refetchOnMount: true,
  });
}

export function progressPercent(p: Pick<SeriesProgress, "owned" | "total">): number {
  if (p.total <= 0) return 0;
  return Math.min(100, Math.round((p.owned / p.total) * 100));
}

export function isComplete(p: Pick<SeriesProgress, "owned" | "total">): boolean {
  return p.total >= 3 && p.owned >= p.total;
}
