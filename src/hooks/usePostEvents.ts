import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { eventPhase, type PostEvent, type PostEventStats } from "@/types/postEvents";

/**
 * お題イベントの一覧（下書きは RLS で管理者にしか返らない）。数は少ない（同時に数件）ので、まとめて1回で読み、
 * 投稿カードのイベントの札・バナー・イベントのページで同じキャッシュを使う。
 */
export function usePostEvents() {
  return useQuery({
    queryKey: ["post-events"],
    queryFn: async (): Promise<PostEvent[]> => {
      const { data, error } = await supabase
        .from("post_events")
        .select("*")
        .order("starts_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** いま参加できるイベント（公開中・期間内）。締め切りが近い順 */
export function useActivePostEvents() {
  const q = usePostEvents();
  const active = useMemo(() => {
    const now = Date.now();
    return (q.data ?? [])
      .filter((e) => eventPhase(e, now) === "open")
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime());
  }, [q.data]);
  return { ...q, data: active };
}

/** id でイベントを1つ（一覧のキャッシュがあればそれを使う） */
export function usePostEvent(id: string | null | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["post-event", id],
    queryFn: async (): Promise<PostEvent | null> => {
      const { data, error } = await supabase.from("post_events").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    initialData: () => qc.getQueryData<PostEvent[]>(["post-events"])?.find((e) => e.id === id),
    staleTime: 60 * 1000,
  });
}

/** 参加の数（だれにでも見えている投稿だけを数える。サーバーの post_event_stats） */
export function usePostEventStats(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["post-event-stats", key],
    queryFn: async (): Promise<Map<string, PostEventStats>> => {
      const map = new Map<string, PostEventStats>();
      if (ids.length === 0) return map;
      const { data, error } = await supabase.rpc("post_event_stats", { _event_ids: ids.slice(0, 50) });
      if (error) throw error;
      for (const r of data ?? []) map.set(r.event_id, { postCount: r.post_count, participantCount: r.participant_count });
      return map;
    },
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });
}

export type PostEventInput = Omit<TablesInsert<"post_events">, "id" | "created_at" | "updated_at" | "created_by">;

/** 管理画面: 作る・直す（RLS で管理者だけ） */
export function useSavePostEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: PostEventInput | TablesUpdate<"post_events"> }) => {
      if (id) {
        const { data, error } = await supabase.from("post_events").update(values).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("post_events")
        .insert({ ...(values as PostEventInput), created_by: auth.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["post-events"] });
      qc.invalidateQueries({ queryKey: ["post-event", row.id] });
    },
  });
}
