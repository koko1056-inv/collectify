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
        throw profileError;
      }
      
      if (!profileData) {
        throw new Error("Profile not found");
      }

      // avatar_urlがない場合のみ、is_current=trueのアバターから同期
      if (!profileData.avatar_url) {
        const { data: currentAvatar } = await supabase
          .from("avatar_gallery")
          .select("image_url")
          .eq("user_id", userId)
          .eq("is_current", true)
          .maybeSingle();

        if (currentAvatar?.image_url) {
          // プロフィールのavatar_urlを更新
          await supabase
            .from("profiles")
            .update({ avatar_url: currentAvatar.image_url })
            .eq("id", userId);
          profileData.avatar_url = currentAvatar.image_url;
        }
      }

      return profileData as Profile;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    // プロフィールは編集・オンボーディング等で変わりやすいので、マウント時は必ず最新を取りに行く
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  return {
    profile: data,
    refetchProfile: refetch,
    isLoading,
    error
  };
}
