import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePollData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

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
      toast({
        title: "投票を作成しました",
        description: "投票が正常に作成されました。",
      });
    },
    onError: (error) => {
      console.error("投票作成エラー:", error);
      toast({
        title: "エラー",
        description: "投票の作成に失敗しました。",
        variant: "destructive",
      });
    },
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      pollId,
      optionId,
    }: {
      pollId: string;
      optionId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

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
      toast({
        title: "投票しました",
        description: "投票が完了しました。",
      });
    },
    onError: (error) => {
      console.error("投票エラー:", error);
      toast({
        title: "エラー",
        description: "投票に失敗しました。",
        variant: "destructive",
      });
    },
  });
}
