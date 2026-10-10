import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImageFile, ITEM_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";
import { streakFromDates, todayJst } from "@/utils/companion";

export interface Companion {
  user_item_id: string;
  xp: number;
  last_pat_on: string | null;
  last_polish_on: string | null;
  last_photo_on: string | null;
  title: string;
  image: string;
  content_name: string | null;
}

export interface OshiPhoto {
  id: string;
  user_item_id: string | null;
  image_url: string;
  caption: string | null;
  taken_on: string;
  created_at: string;
}

export interface CareResult {
  ok: boolean;
  already?: boolean;
  xp?: number;
  gain?: number;
  level?: number;
  leveled_up?: boolean;
}

/** 相棒グッズ（最大3つ）と、グッズの名前・写真 */
export function useCompanions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["companions", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<Companion[]> => {
      const { data, error } = await supabase
        .from("companion_goods")
        .select("user_item_id, xp, last_pat_on, last_polish_on, last_photo_on, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: items, error: itemError } = await supabase
        .from("user_items")
        .select("id, title, image, content_name")
        .in("id", rows.map((r) => r.user_item_id));
      if (itemError) throw itemError;
      const byId = new Map((items ?? []).map((i) => [i.id as string, i]));
      return rows
        .filter((r) => byId.has(r.user_item_id))
        .map((r) => {
          const it = byId.get(r.user_item_id)!;
          return {
            user_item_id: r.user_item_id,
            xp: r.xp,
            last_pat_on: r.last_pat_on,
            last_polish_on: r.last_polish_on,
            last_photo_on: r.last_photo_on,
            title: it.title as string,
            image: it.image as string,
            content_name: (it.content_name as string | null) ?? null,
          };
        });
    },
  });
}

export function useCareCompanion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: "pat" | "polish" }): Promise<CareResult> => {
      const { data, error } = await supabase.rpc("care_companion", { _user_item_id: itemId, _action: action });
      if (error) throw error;
      return data as unknown as CareResult;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["companions", user?.id] });
      void qc.invalidateQueries({ queryKey: ["userPoints"] });
    },
  });
}

export function useSetCompanion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc("set_companion", { _user_item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companions", user?.id] }),
  });
}

export function useRemoveCompanion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc("remove_companion", { _user_item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companions", user?.id] }),
  });
}

/** 推しフォト（直近の分。カレンダーと連続日数に使う） */
export function useOshiPhotos(days = 400) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["oshi-photos", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<OshiPhoto[]> => {
      const since = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("oshi_photos")
        .select("id, user_item_id, image_url, caption, taken_on, created_at")
        .eq("user_id", user!.id)
        .gte("taken_on", since)
        .order("taken_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as OshiPhoto[];
    },
  });
  const photos = query.data ?? [];
  const derived = useMemo(() => {
    const dates = new Set(photos.map((p) => p.taken_on));
    const { streak, today } = streakFromDates(dates);
    return { streak, todayDone: today, total: photos.length, todayPhotos: photos.filter((p) => p.taken_on === todayJst()) };
  }, [photos]);
  return { ...query, photos, ...derived };
}

export function useUploadOshiPhoto() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, itemId, caption }: { file: File; itemId: string | null; caption?: string }) => {
      if (!user) throw new Error("login_required");
      // 圧縮して、撮影場所などの情報（EXIF）も取り除いてから保存する
      const compressed = await compressImageFile(file, ITEM_IMAGE_OPTIONS);
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${user.id}/oshi/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("kuji_images")
        .upload(path, compressed, { cacheControl: UPLOAD_CACHE_CONTROL });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("kuji_images").getPublicUrl(path);
      const { error } = await supabase.from("oshi_photos").insert({
        user_id: user.id,
        user_item_id: itemId,
        image_url: urlData.publicUrl,
        caption: caption?.trim() || null,
      });
      if (error) {
        // 保存に失敗したら、置いたファイルを残さない
        await supabase.storage.from("kuji_images").remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["oshi-photos", user?.id] });
      void qc.invalidateQueries({ queryKey: ["companions", user?.id] });
      void qc.invalidateQueries({ queryKey: ["userPoints"] });
    },
  });
}

export function useDeleteOshiPhoto() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: OshiPhoto) => {
      const { error } = await supabase.from("oshi_photos").delete().eq("id", photo.id);
      if (error) throw error;
      // 置いたファイルも消す（自分のフォルダのものだけ）
      const marker = "/object/public/kuji_images/";
      const idx = photo.image_url.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(photo.image_url.slice(idx + marker.length));
        if (user && path.startsWith(`${user.id}/`)) await supabase.storage.from("kuji_images").remove([path]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["oshi-photos", user?.id] }),
  });
}
