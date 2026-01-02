
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

export function useProfile(userId: string | undefined) {
  const { data, refetch, isLoading, error } = useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID not provided");
      
      console.log("[useProfile] Fetching profile for userId:", userId);
      
      // プロフィールを取得（明示的に全フィールドを指定）
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          created_at,
          favorite_contents,
          favorite_item_ids,
          favorite_tags,
          followers_count,
          following_count,
          is_admin,
          interests,
          x_username
        `)
        .eq("id", userId)
        .maybeSingle();
      
      if (profileError) {
        console.error("[useProfile] Error fetching profile:", profileError);
        throw profileError;
      }
      
      if (!profileData) {
        console.error("[useProfile] Profile not found for userId:", userId);
        throw new Error("Profile not found");
      }
      
      console.log("[useProfile] Profile fetched successfully:", {
        id: profileData.id,
        username: profileData.username,
        hasId: !!profileData.id
      });
      
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
    staleTime: 0, // 常に最新データを取得
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
