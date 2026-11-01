import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeProfileExtras, type ProfileExtras } from "@/lib/profileExtras";

/**
 * 本人だけが読める「あなたのこと」（public.profile_private）。
 * row: 行があるか（= 一度でも聞いたか）。読めなかったとき（テーブルがまだ無い等）は query がエラーになる。
 */
export const PROFILE_PRIVATE_KEY = "profilePrivate";

export interface ProfilePrivateResult {
  row: "missing" | "exists";
  extras: ProfileExtras;
}

export function useProfilePrivate(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<ProfilePrivateResult>({
    queryKey: [PROFILE_PRIVATE_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_private")
        .select("gender, age_range, prefecture, oshi_years, monthly_budget, goods_types, trade_frequency")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return { row: data ? "exists" : "missing", extras: sanitizeProfileExtras(data) };
    },
    enabled: !!user?.id && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    // テーブルがまだ無い環境で何度も叩かない
    retry: false,
  });
}

/** 保存（行が無ければ作る）と「聞いた」印（空の行を作るだけ。答えは上書きしない） */
export function useSaveProfilePrivate() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const save = useCallback(
    async (extras: ProfileExtras) => {
      if (!user?.id) throw new Error("not signed in");
      const v = sanitizeProfileExtras(extras);
      const { error } = await supabase.from("profile_private").upsert(
        {
          user_id: user.id,
          ...v,
          // 何も選ばなかった複数選択は空の配列ではなく NULL にする（「答えていない」と同じ扱い）
          goods_types: v.goods_types.length > 0 ? v.goods_types : null,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      qc.setQueryData<ProfilePrivateResult>([PROFILE_PRIVATE_KEY, user.id], { row: "exists", extras: v });
    },
    [user?.id, qc]
  );

  const markAsked = useCallback(async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("profile_private")
      .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) throw error;
    qc.setQueryData<ProfilePrivateResult | undefined>([PROFILE_PRIVATE_KEY, user.id], (prev) =>
      prev ? { ...prev, row: "exists" } : prev
    );
  }, [user?.id, qc]);

  return { save, markAsked };
}
