import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AiWorkType = "room" | "avatar";

export interface AiWorkBookmark {
  id: string;
  user_id: string;
  work_id: string;
  work_type: AiWorkType;
  created_at: string;
}

/** 自分のブックマークID一覧（map で参照しやすいよう Set で返す） */
export function useMyAiBookmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-bookmarks", user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from("ai_work_bookmarks")
        .select("work_id, work_type")
        .eq("user_id", user.id);
      if (error) throw error;
      return new Set((data || []).map((b) => `${b.work_type}:${b.work_id}`));
    },
    enabled: !!user?.id,
  });
}

/** ブックマークの作成 / 削除トグル */
export function useToggleAiBookmark() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workId,
      workType,
      isBookmarked,
    }: {
      workId: string;
      workType: AiWorkType;
      isBookmarked: boolean;
    }) => {
      if (!user?.id) throw new Error("ログインしてください");
      if (isBookmarked) {
        const { error } = await supabase
          .from("ai_work_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("work_id", workId)
          .eq("work_type", workType);
        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase.from("ai_work_bookmarks").insert({
          user_id: user.id,
          work_id: workId,
          work_type: workType,
        });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: ["ai-bookmarks", user?.id] });
      qc.invalidateQueries({ queryKey: ["ai-bookmarks-list", user?.id] });
      toast.success(added ? "ブックマークしました 📌" : "ブックマークを解除しました");
    },
    onError: (e) => toast.error((e as Error).message || "更新に失敗しました"),
  });
}

/** マイページ用: 保存した作品の一覧 (room と avatar を結合) */
export function useBookmarkedAiWorks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-bookmarks-list", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: bms, error } = await supabase
        .from("ai_work_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const roomIds = (bms || []).filter((b) => b.work_type === "room").map((b) => b.work_id);
      const avatarIds = (bms || []).filter((b) => b.work_type === "avatar").map((b) => b.work_id);

      const [roomsRes, avatarsRes] = await Promise.all([
        roomIds.length
          ? supabase.from("ai_generated_rooms").select("*").in("id", roomIds)
          : Promise.resolve({ data: [], error: null } as any),
        avatarIds.length
          ? supabase.from("avatar_gallery").select("*").in("id", avatarIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const roomsMap = new Map((roomsRes.data || []).map((r: any) => [r.id, r]));
      const avatarsMap = new Map((avatarsRes.data || []).map((a: any) => [a.id, a]));

      return (bms || [])
        .map((b) => {
          if (b.work_type === "room") {
            const r = roomsMap.get(b.work_id);
            return r
              ? { type: "room" as const, bookmarkedAt: b.created_at, work: r }
              : null;
          }
          const a = avatarsMap.get(b.work_id);
          return a
            ? { type: "avatar" as const, bookmarkedAt: b.created_at, work: a }
            : null;
        })
        .filter(Boolean);
    },
    enabled: !!user?.id,
  });
}
