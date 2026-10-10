import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeedbackKind = "content" | "feature" | "bug" | "other";
export type FeedbackStatus = "open" | "reviewing" | "planned" | "done" | "declined";

export interface FeedbackRequest {
  id: string;
  user_id: string;
  kind: FeedbackKind;
  title: string;
  body: string | null;
  url: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  is_public: boolean;
  vote_count: number;
  created_at: string;
}

const COLUMNS = "id, user_id, kind, title, body, url, status, admin_note, is_public, vote_count, created_at";

/** 自分が送った要望（状況つき） */
export function useMyFeedback() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feedback-mine", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<FeedbackRequest[]> => {
      const { data, error } = await supabase
        .from("feedback_requests")
        .select(COLUMNS)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as FeedbackRequest[];
    },
  });
}

/** 運営が公開した、みんなの要望（票の多い順）と、自分が票を入れたもの */
export function usePublicFeedback() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feedback-public", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data, error }, { data: votes, error: voteError }] = await Promise.all([
        supabase
          .from("feedback_requests")
          .select(COLUMNS)
          .eq("is_public", true)
          .order("vote_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("feedback_votes").select("request_id").eq("user_id", user!.id),
      ]);
      if (error) throw error;
      if (voteError) throw voteError;
      return {
        items: (data ?? []) as FeedbackRequest[],
        voted: new Set((votes ?? []).map((v) => v.request_id as string)),
      };
    },
  });
}

export interface FeedbackInput {
  kind: FeedbackKind;
  title: string;
  body?: string;
  url?: string;
}

export function useSubmitFeedback() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FeedbackInput) => {
      if (!user) throw new Error("login_required");
      const { error } = await supabase.from("feedback_requests").insert({
        user_id: user.id,
        kind: input.kind,
        title: input.title.trim(),
        body: input.body?.trim() || null,
        url: input.url?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback-mine", user?.id] }),
  });
}

export function useToggleFeedbackVote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, voted }: { requestId: string; voted: boolean }) => {
      if (!user) throw new Error("login_required");
      const q = supabase.from("feedback_votes");
      const { error } = voted
        ? await q.delete().eq("request_id", requestId).eq("user_id", user.id)
        : await q.insert({ request_id: requestId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback-public", user?.id] }),
  });
}
