
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
        .single();
      if (error) throw error;
      if (!data) throw new Error("Profile not found");
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });

  return {
    profile: data,
    refetchProfile: refetch
  };
}
