import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreateChallengeData {
  title: string;
  description?: string;
  image_url?: string;
  official_item_id?: string;
  ends_at: string;
  first_place_points?: number;
  second_place_points?: number;
  third_place_points?: number;
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: CreateChallengeData) => {
      if (!user) throw new Error(t("notices.common.loginRequired"));

      const firstPoints = data.first_place_points || 100;
      const secondPoints = data.second_place_points || 50;
      const thirdPoints = data.third_place_points || 30;
      const totalPrizePoints = firstPoints + secondPoints + thirdPoints;

      // 残高検証・減算・チャレンジ作成・履歴記録を1トランザクションで実行する。
      // 以前は「減算 → INSERT」の2段だったため、間で離脱するとポイントだけ失われ、
      // 保存される賞金額が減算額と一致する保証も無かった。
      const { data: challengeId, error } = await supabase.rpc("create_challenge", {
        _title: data.title,
        _ends_at: data.ends_at,
        _description: data.description ?? null,
        _image_url: data.image_url ?? null,
        _official_item_id: data.official_item_id ?? null,
        _first: firstPoints,
        _second: secondPoints,
        _third: thirdPoints,
      });

      if (error) {
        if (error.message?.includes("Insufficient points")) {
          throw new Error(t("notices.points.insufficientRequired", { required: totalPrizePoints }));
        }
        throw error;
      }

      return { id: challengeId as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      toast.success(t("notices.challenges.created"));
    },
    onError: (error) => {
      toast.error(t("notices.common.errorTitle"), {
        description: error.message,
      });
    },
  });
}

interface CreateEntryData {
  challenge_id: string;
  user_item_id?: string;
  image_url: string;
  caption?: string;
}

export function useCreateChallengeEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: CreateEntryData) => {
      if (!user) throw new Error(t("notices.common.loginRequired"));

      const { data: entry, error } = await supabase
        .from("challenge_entries")
        .insert({
          challenge_id: data.challenge_id,
          user_id: user.id,
          user_item_id: data.user_item_id,
          image_url: data.image_url,
          caption: data.caption,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error(t("notices.challenges.alreadyEntered"));
        }
        throw error;
      }
      return entry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries", variables.challenge_id] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast.success(t("notices.challenges.entered"));
    },
    onError: (error) => {
      toast.error(t("notices.common.errorTitle"), {
        description: error.message,
      });
    },
  });
}

export function useVoteForEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ challengeId, entryId, hasVoted }: { challengeId: string; entryId: string; hasVoted: boolean }) => {
      if (!user) throw new Error(t("notices.common.loginRequired"));

      if (hasVoted) {
        // 投票を取り消す
        const { error } = await supabase
          .from("challenge_votes")
          .delete()
          .eq("challenge_id", challengeId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // 投票する（既存の投票があれば削除してから）
        await supabase
          .from("challenge_votes")
          .delete()
          .eq("challenge_id", challengeId)
          .eq("user_id", user.id);

        const { error } = await supabase
          .from("challenge_votes")
          .insert({
            challenge_id: challengeId,
            entry_id: entryId,
            user_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries", variables.challengeId] });
    },
    onError: (error) => {
      toast.error(t("notices.common.errorTitle"), {
        description: error.message,
      });
    },
  });
}

export function useEndChallenge() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      // 順位算定・賞金付与・締めをサーバー側で1回だけ実行する。
      // 以前はクライアントが順位を計算して付与RPCを回しており、
      // 上限も冪等性も無かったため、賞金を何度でも配ることができた。
      const { data, error } = await supabase.rpc("settle_challenge", {
        _challenge_id: challengeId,
      });
      if (error) throw error;

      return (data as { winners?: unknown[] })?.winners ?? [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      toast.success(t("notices.challenges.endedWithPoints"));
    },
    onError: (error) => {
      toast.error(t("notices.common.errorTitle"), {
        description: error.message,
      });
    },
  });
}
