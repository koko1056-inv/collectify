
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";
import { ensureProfileImagesPublicUrl, isProfileImagesPublicUrl } from "@/utils/avatar-storage";

export function useProfile(userId: string | undefined) {
  const { data, refetch, isLoading, error } = useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID not provided");
      
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
        throw profileError;
      }
      
      if (!profileData) {
        throw new Error("Profile not found");
      }
      
      // avatar_url の不安定要因（外部URL/一時URL）を排除し、常に profile_images の public URL に正規化
      if (profileData.avatar_url && !isProfileImagesPublicUrl(profileData.avatar_url)) {
        try {
          const stableUrl = await ensureProfileImagesPublicUrl({
            userId,
            sourceUrl: profileData.avatar_url,
          });

          if (stableUrl && stableUrl !== profileData.avatar_url) {
            await supabase.from("profiles").update({ avatar_url: stableUrl }).eq("id", userId);
            profileData.avatar_url = stableUrl;
          }
        } catch {
          // 正規化に失敗してもプロフィール取得自体は継続
        }
      }

      // avatar_urlがない場合のみ、is_current=trueのアバターを取得して同期（こちらも正規化）
      if (!profileData.avatar_url) {
        const { data: currentAvatar } = await supabase
          .from("avatar_gallery")
          .select("image_url")
          .eq("user_id", userId)
          .eq("is_current", true)
          .maybeSingle();

        if (currentAvatar?.image_url) {
          try {
            const stableUrl = await ensureProfileImagesPublicUrl({
              userId,
              sourceUrl: currentAvatar.image_url,
            });

            await supabase.from("profiles").update({ avatar_url: stableUrl }).eq("id", userId);
            profileData.avatar_url = stableUrl;
          } catch {
            // 失敗時は従来URLで同期（表示自体はAvatarImage側のリトライに委ねる）
            await supabase.from("profiles").update({ avatar_url: currentAvatar.image_url }).eq("id", userId);
            profileData.avatar_url = currentAvatar.image_url;
          }
        }
      }
      return profileData as Profile;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2分間キャッシュ
    gcTime: 1000 * 60 * 30, // 30分間保持
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    profile: data,
    refetchProfile: refetch,
    isLoading,
    error
  };
}
