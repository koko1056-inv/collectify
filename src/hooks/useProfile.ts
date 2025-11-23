
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

export function useProfile(userId: string | undefined) {
  const { data, refetch, isLoading, error } = useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID not provided");
      
      // プロフィールを取得
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      if (profileError) throw profileError;
      if (!profileData) throw new Error("Profile not found");
      
      // is_current=trueのアバターを取得
      const { data: currentAvatar } = await supabase
        .from("avatar_gallery")
        .select("image_url")
        .eq("user_id", userId)
        .eq("is_current", true)
        .maybeSingle();
      
      // is_currentのアバターがあり、プロフィール側にまだavatar_urlがない場合のみ同期
      if (currentAvatar && !profileData.avatar_url) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: currentAvatar.image_url })
          .eq("id", userId);
        
        if (!updateError) {
          // 同期した新しいURLをプロフィールに反映
          profileData.avatar_url = currentAvatar.image_url;
        }
      }
      
      return profileData as Profile;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ
    gcTime: 30 * 60 * 1000, // 30分間保持
    refetchOnMount: true, // マウント時に再取得
    refetchOnWindowFocus: true, // フォーカス時に再取得
  });

  return {
    profile: data,
    refetchProfile: refetch,
    isLoading,
    error
  };
}
