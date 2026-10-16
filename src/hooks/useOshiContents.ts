import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanions } from "@/hooks/useOshi";

/**
 * 「推しの作品」の名前の一覧。新着・発売予定・人気のグッズを絞るのに使う。
 *
 * 推しの作品は3か所に散っている:
 *  - profiles.favorite_contents … 「好きな作品」として選んだもの（いちばん確か）
 *  - 推しグッズ（get_my_oshi_goods）の作品 … 実際に推しとして飾っているグッズの作品
 *  - profiles.interests … はじめに選んだ興味（広め）
 * この順で並べ、重なりは1つにする（先頭ほど本人にとって大事な作品）。
 */
export function useOshiContents() {
  const { user } = useAuth();
  const uid = user?.id;

  const profile = useQuery({
    queryKey: ["oshi-contents-profile", uid],
    enabled: !!uid,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("interests, favorite_contents").eq("id", uid!).maybeSingle();
      if (error) throw error;
      return { favorites: (data?.favorite_contents ?? []) as string[], interests: (data?.interests ?? []) as string[] };
    },
  });
  const companions = useCompanions();

  const names = useMemo(() => {
    const ordered = [
      ...(profile.data?.favorites ?? []),
      ...(companions.data ?? []).map((c) => c.content_name ?? ""),
      ...(profile.data?.interests ?? []),
    ];
    return [...new Set(ordered.map((s) => s.trim()).filter(Boolean))];
  }, [profile.data, companions.data]);

  return {
    names,
    /** プロフィールを読み終えた（推しの作品が無い人も、ここで「無い」と分かる） */
    ready: !uid || profile.isSuccess || profile.isError,
  };
}
