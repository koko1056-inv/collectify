
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

export function useProfile(userId: string | undefined) {
  const { data, refetch } = useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID not provided");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // single()の代わりにmaybeSingle()を使用
      
      if (error) throw error;
      if (!data) throw new Error("Profile not found");
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30秒間キャッシュ
    gcTime: 60 * 60 * 1000, // 1時間保持
    refetchOnMount: true, // マウント時に再取得
    refetchOnWindowFocus: true, // フォーカス時に再取得
  });

  return {
    profile: data,
    refetchProfile: refetch
  };
}
