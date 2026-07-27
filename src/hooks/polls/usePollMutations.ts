import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreatePollData {
  title: string;
  description?: string;
  ends_at?: string;
  options: Array<{
    text: string;
    official_item_id?: string;
    image_url?: string;
  }>;
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: CreatePollData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("notices.common.loginRequired"));

      // 投票を作成
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description,
          ends_at: data.ends_at,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // 選択肢を作成
      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(
          data.options.map((option) => ({
            poll_id: poll.id,
            text: option.text,
            official_item_id: option.official_item_id,
            image_url: option.image_url,
          }))
        );

      if (optionsError) throw optionsError;

      return poll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast.success(t("notices.polls.createdTitle"), {
        description: t("notices.polls.createdDesc"),
      });
    },
    onError: (error) => {
      console.error("投票作成エラー:", error);
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.polls.createFailedDesc"),
      });
    },
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      pollId,
      optionId,
    }: {
      pollId: string;
      optionId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("notices.common.loginRequired"));

      // 既存の投票を削除
      await supabase
        .from("poll_votes")
        .delete()
        .eq("poll_id", pollId)
        .eq("user_id", user.id);

      // 新しい投票を追加
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: pollId,
        poll_option_id: optionId,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast.success(t("notices.polls.votedTitle"), {
        description: t("notices.polls.votedDesc"),
      });
    },
    onError: (error) => {
      console.error("投票エラー:", error);
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.polls.voteFailedDesc"),
      });
    },
  });
}
