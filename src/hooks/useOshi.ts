import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImageFile, ITEM_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";
import { streakFromDates, todayJst } from "@/utils/companion";

/** 推しグッズ1つ（推しフォトの画面で育てる）。rank は 1〜5 の順位 */
export interface Companion {
  rank: number;
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

/** プレゼントの種類。値段・xp・1日の回数は DB（companion_gift_kinds）だけが正で、ここでは表示に使うだけ */
export interface GiftKind {
  kind: string;
  price: number;
  xp: number;
  daily_limit: number;
}

export interface GiftResult {
  ok: boolean;
  kind: string;
  xp: number;
  gain: number;
  level: number;
  leveled_up: boolean;
  points_left: number;
  remaining_today: number;
}

/** give_companion_gift が返すエラー（RAISE の文言）。それ以外は unknown */
export type GiftErrorCode = "insufficient_points" | "gift_daily_limit" | "max_level" | "not_companion" | "unknown";

export function giftErrorCode(e: unknown): GiftErrorCode {
  const message = e instanceof Error ? e.message : ((e as { message?: string })?.message ?? "");
  for (const code of ["insufficient_points", "gift_daily_limit", "max_level", "not_companion"] as const) {
    if (message.includes(code)) return code;
  }
  return "unknown";
}

/** プロフィールに出す推しグッズ（順位・グッズの名前・写真・なかよし度だけ） */
export interface ProfileOshiGoods {
  rank: number;
  user_item_id: string;
  title: string;
  image: string;
  content_name: string | null;
  xp: number;
  level: number;
}

export interface CareResult {
  ok: boolean;
  already?: boolean;
  xp?: number;
  gain?: number;
  level?: number;
  leveled_up?: boolean;
}

/**
 * 自分の推しグッズ（最大5つ・順位の順）と、育ち具合・今日のお世話。
 * 以前は companion_goods（相棒・最大3つ）を迎えた順に読んでいた。いまは推しグッズ（profiles.favorite_item_ids）が正で、
 * 並びも数もそちらに合わせるため、順位と育ち具合を1回で返す get_my_oshi_goods を使う。
 */
export function useCompanions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["companions", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<Companion[]> => {
      const { data, error } = await supabase.rpc("get_my_oshi_goods");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        rank: r.rank_no,
        user_item_id: r.user_item_id,
        xp: r.xp,
        last_pat_on: r.last_pat_on,
        last_polish_on: r.last_polish_on,
        last_photo_on: r.last_photo_on,
        title: r.title,
        image: r.image,
        content_name: r.content_name ?? null,
      }));
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
      void qc.invalidateQueries({ queryKey: ["profile-oshi-goods", user?.id] });
      void qc.invalidateQueries({ queryKey: ["userPoints"] });
    },
  });
}

/** プレゼントの種類（おやつ・特別なプレゼント） */
export function useCompanionGiftKinds() {
  return useQuery({
    queryKey: ["companion-gift-kinds"],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<GiftKind[]> => {
      const { data, error } = await supabase
        .from("companion_gift_kinds")
        .select("kind, price, xp, daily_limit")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * 今日（日本時間）すでに贈った回数。推しグッズごと・種類ごと。キーは `${user_item_id}:${kind}`。
 * 回数の上限はサーバーが確かめる。ここは「あと何回」を出すためだけ。
 */
export function useTodayGiftCounts() {
  const { user } = useAuth();
  const today = todayJst();
  return useQuery({
    queryKey: ["companion-gifts-today", user?.id, today],
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("companion_gifts")
        .select("user_item_id, kind")
        .eq("user_id", user!.id)
        .eq("given_on", today);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const key = `${row.user_item_id}:${row.kind}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return counts;
    },
  });
}

/** プレゼントを贈る。値段は送らない（種類だけ。値段・残高・回数はサーバーが決めて確かめる） */
export function useGiveCompanionGift() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, kind }: { itemId: string; kind: string }): Promise<GiftResult> => {
      const { data, error } = await supabase.rpc("give_companion_gift", { _user_item_id: itemId, _kind: kind });
      if (error) throw error;
      return data as unknown as GiftResult;
    },
    onSettled: () => {
      // 失敗（残高不足・回数切れ）でも、画面の数字がずれていた可能性があるので取り直す
      void qc.invalidateQueries({ queryKey: ["companions", user?.id] });
      void qc.invalidateQueries({ queryKey: ["companion-gifts-today", user?.id] });
      void qc.invalidateQueries({ queryKey: ["profile-oshi-goods", user?.id] });
      void qc.invalidateQueries({ queryKey: ["userPoints"] });
      void qc.invalidateQueries({ queryKey: ["pointTransactions"] });
    },
  });
}

/**
 * プロフィールに出す推しグッズ（最大5つ・順位の順）。本人以外でも、プロフィールを見られる人には見える。
 * companion_goods は本人しか読めないので、表示に要る列だけを返す get_profile_oshi_goods を使う。
 * 以前は get_profile_companions（相棒・最大3つ）だった。古いアプリのためにそちらも同じ中身で残してある
 */
export function useProfileOshiGoods(profileId: string | undefined) {
  return useQuery({
    queryKey: ["profile-oshi-goods", profileId],
    enabled: !!profileId,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<ProfileOshiGoods[]> => {
      const { data, error } = await supabase.rpc("get_profile_oshi_goods", { _profile_id: profileId! });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        rank: r.rank_no,
        user_item_id: r.user_item_id,
        title: r.title,
        image: r.image,
        content_name: r.content_name ?? null,
        xp: r.xp,
        level: r.level,
      }));
    },
  });
}

// 以前ここにあった useSetCompanion / useRemoveCompanion（相棒を1つずつ迎える・はずす）はなくした。
// 推しグッズは、選ぶ・並べ替えるを1つの画面（OshiGoodsEditModal）でまとめて保存する

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
      void qc.invalidateQueries({ queryKey: ["profile-oshi-goods", user?.id] });
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
