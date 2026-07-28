import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ExploreAvatar {
  id: string;
  user_id: string;
  image_url: string;
  name: string | null;
  prompt: string | null;
  item_ids: string[] | null;
  like_count: number;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
  } | null;
}

export const AVATAR_PAGE_SIZE = 24;

/**
 * 公開アバターのフィード。
 *
 * avatar_gallery の SELECT ポリシーが「自分 or is_public」なので、
 * is_public で絞れば他人の公開アバターが読める。
 */
export function usePublicAvatars() {
  return useInfiniteQuery({
    queryKey: ["explore-ai-avatars"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * AVATAR_PAGE_SIZE;
      const to = from + AVATAR_PAGE_SIZE - 1;

      const { data: avatars, error } = await supabase
        .from("avatar_gallery")
        .select("id, user_id, image_url, name, prompt, item_ids, like_count, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;

      // 投稿者のプロフィールをまとめて引く（1件ずつ引くと N+1 になる）
      const userIds = Array.from(new Set((avatars || []).map((a) => a.user_id)));
      const profilesMap = new Map<string, ExploreAvatar["profile"]>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, display_name")
          .in("id", userIds);
        (profiles || []).forEach((p) =>
          profilesMap.set(p.id, {
            username: p.username,
            avatar_url: p.avatar_url,
            display_name: p.display_name,
          })
        );
      }

      return (avatars || []).map((a) => ({
        ...a,
        profile: profilesMap.get(a.user_id) ?? null,
      })) as ExploreAvatar[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === AVATAR_PAGE_SIZE ? allPages.length : undefined,
  });
}

/** 自分がいいねした公開アバターの id 集合 */
export function useMyAvatarLikes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["avatar-likes", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("avatar_likes")
        .select("avatar_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data || []).map((l) => l.avatar_id));
    },
  });
}

/**
 * いいねの切り替え。
 * 判定と like_count の同期はサーバー側（toggle_avatar_like + トリガ）が行う。
 */
export function useToggleAvatarLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (avatarId: string) => {
      if (!user?.id) throw new Error(t("notices.common.loginRequired"));
      const { data, error } = await supabase.rpc("toggle_avatar_like", {
        _avatar_id: avatarId,
      });
      if (error) throw error;
      return data as { liked: boolean; like_count: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avatar-likes"] });
      qc.invalidateQueries({ queryKey: ["explore-ai-avatars"] });
      qc.invalidateQueries({ queryKey: ["ai-avatar-detail"] });
    },
    onError: (e) => {
      toast.error((e as Error).message || t("notices.common.errorTitle"));
    },
  });
}

/** 公開 / 非公開の切り替え（本人のみ） */
export function useSetAvatarVisibility() {
  const qc = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ avatarId, isPublic }: { avatarId: string; isPublic: boolean }) => {
      const { error } = await supabase.rpc("set_avatar_visibility", {
        _avatar_id: avatarId,
        _is_public: isPublic,
      });
      if (error) throw error;
      return isPublic;
    },
    onSuccess: (isPublic) => {
      qc.invalidateQueries({ queryKey: ["avatars"] });
      qc.invalidateQueries({ queryKey: ["explore-ai-avatars"] });
      toast.success(
        isPublic ? t("notices.avatars.published") : t("notices.avatars.unpublished")
      );
    },
    onError: (e) => {
      toast.error((e as Error).message || t("notices.avatars.visibilityFailed"));
    },
  });
}

/** 公開アバター1件の詳細（非公開なら RLS により取得できない） */
export function useAvatarDetail(avatarId: string | undefined) {
  return useQuery({
    queryKey: ["ai-avatar-detail", avatarId],
    enabled: !!avatarId,
    queryFn: async (): Promise<ExploreAvatar | null> => {
      const { data, error } = await supabase
        .from("avatar_gallery")
        .select("id, user_id, image_url, name, prompt, item_ids, like_count, created_at")
        .eq("id", avatarId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, display_name")
        .eq("id", data.user_id)
        .maybeSingle();

      return { ...data, profile: profile ?? null } as ExploreAvatar;
    },
  });
}
