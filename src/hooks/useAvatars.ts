import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfileImagesPublicUrl } from "@/utils/avatar-storage";
import { toast } from "sonner";

export interface AvatarRow {
  id: string;
  user_id: string;
  image_url: string;
  name: string | null;
  prompt: string | null;
  item_ids: string[] | null;
  is_current: boolean | null;
  created_at: string;
}

const QK = (userId?: string) => ["avatars", userId ?? "anon"] as const;

/**
 * アバター周りの操作を一元管理するフック。
 * - 取得 (avatar_gallery 全件)
 * - 切替 (set_current_avatar RPC)
 * - 削除 / 名前変更
 * - ファイルアップロード
 * - AI生成結果の保存
 * - リアルタイム購読
 */
export function useAvatars(userId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QK(userId),
    enabled: !!userId,
    queryFn: async (): Promise<AvatarRow[]> => {
      const { data, error } = await supabase
        .from("avatar_gallery")
        .select("id, user_id, image_url, name, prompt, item_ids, is_current, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AvatarRow[];
    },
  });

  const avatars = query.data ?? [];
  const currentAvatar = avatars.find((a) => a.is_current) ?? avatars[0] ?? null;
  const baseAvatars = avatars.filter((a) => !a.item_ids || a.item_ids.length === 0);
  const dressedAvatars = avatars.filter((a) => a.item_ids && a.item_ids.length > 0);

  const invalidate = () => qc.invalidateQueries({ queryKey: QK(userId) });

  // リアルタイム購読
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`avatars:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "avatar_gallery", filter: `user_id=eq.${userId}` },
        () => invalidate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setCurrent = useMutation({
    mutationFn: async (avatarId: string) => {
      const { data, error } = await supabase.rpc("set_current_avatar", { _avatar_id: avatarId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("アバターを切り替えました");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "切り替えに失敗しました"),
  });

  const remove = useMutation({
    mutationFn: async (avatarId: string) => {
      const { error } = await supabase.from("avatar_gallery").delete().eq("id", avatarId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("アバターを削除しました");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "削除に失敗しました"),
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("avatar_gallery")
        .update({ name: name.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("名前を更新しました");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "名前の更新に失敗しました"),
  });

  /**
   * ファイルから新規アバターを追加し、現在のアバターに設定する。
   */
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("profile_images").upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("profile_images").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { data: row, error: insErr } = await supabase
        .from("avatar_gallery")
        .insert({ user_id: userId, image_url: publicUrl, prompt: "アップロード画像" })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const { error: rpcErr } = await supabase.rpc("set_current_avatar", { _avatar_id: row.id });
      if (rpcErr) throw rpcErr;

      return publicUrl;
    },
    onSuccess: () => {
      toast.success("アバターをアップロードしました");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "アップロードに失敗しました"),
  });

  /**
   * AI生成や着せ替えで得た画像URLを保存し、現在のアバターに設定する。
   */
  const saveGenerated = useMutation({
    mutationFn: async (params: {
      imageUrl: string;
      prompt?: string | null;
      itemIds?: string[] | null;
      name?: string | null;
      makeCurrent?: boolean;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const stableUrl = await ensureProfileImagesPublicUrl({ userId, sourceUrl: params.imageUrl });
      const { data: row, error: insErr } = await supabase
        .from("avatar_gallery")
        .insert({
          user_id: userId,
          image_url: stableUrl,
          prompt: params.prompt ?? null,
          item_ids: params.itemIds ?? null,
          name: params.name ?? null,
        })
        .select("id, image_url")
        .single();
      if (insErr) throw insErr;

      if (params.makeCurrent !== false) {
        const { error: rpcErr } = await supabase.rpc("set_current_avatar", { _avatar_id: row.id });
        if (rpcErr) throw rpcErr;
      }
      return row as { id: string; image_url: string };
    },
    onSuccess: () => invalidate(),
  });

  return {
    // data
    avatars,
    baseAvatars,
    dressedAvatars,
    currentAvatar,
    isLoading: query.isLoading,
    refetch: query.refetch,
    // mutations
    setCurrent,
    remove,
    rename,
    uploadFile,
    saveGenerated,
  };
}
