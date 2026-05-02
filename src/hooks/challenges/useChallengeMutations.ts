import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateChallengeData) => {
      if (!user) throw new Error("ログインが必要です");

      const firstPoints = data.first_place_points || 100;
      const secondPoints = data.second_place_points || 50;
      const thirdPoints = data.third_place_points || 30;
      const totalPrizePoints = firstPoints + secondPoints + thirdPoints;

      // ポイント減算 + 履歴記録（サーバー側で残高検証）
      const { error: deductErr } = await supabase.rpc("deduct_points_for_challenge", {
        _total_prize: totalPrizePoints,
        _description: `チャレンジ「${data.title}」作成（賞金プール）`,
      });
      if (deductErr) {
        if (deductErr.message?.includes("Insufficient points")) {
          throw new Error(`ポイントが不足しています（必要: ${totalPrizePoints}pt）`);
        }
        throw deductErr;
      }

      // チャレンジを作成
      const { data: challenge, error } = await supabase
        .from("challenges")
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description,
          image_url: data.image_url,
          official_item_id: data.official_item_id,
          ends_at: data.ends_at,
          first_place_points: firstPoints,
          second_place_points: secondPoints,
          third_place_points: thirdPoints,
        })
        .select()
        .single();

      if (error) {
        // チャレンジ作成失敗時はポイントを戻す
        await supabase
          .from("user_points")
          .update({ total_points: currentPoints })
          .eq("user_id", user.id);
        throw error;
      }

      return challenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      toast({ title: "チャレンジを作成しました" });
    },
    onError: (error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateEntryData) => {
      if (!user) throw new Error("ログインが必要です");

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
          throw new Error("このチャレンジには既に参加しています");
        }
        throw error;
      }
      return entry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries", variables.challenge_id] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast({ title: "チャレンジに参加しました！" });
    },
    onError: (error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });
}

export function useVoteForEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ challengeId, entryId, hasVoted }: { challengeId: string; entryId: string; hasVoted: boolean }) => {
      if (!user) throw new Error("ログインが必要です");

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
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });
}

export function useEndChallenge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      // Get entries sorted by votes
      const { data: entries, error: entriesError } = await supabase
        .from("challenge_entries")
        .select(`
          *,
          challenge_votes (id)
        `)
        .eq("challenge_id", challengeId);

      if (entriesError) throw entriesError;

      // Get challenge info
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .single();

      if (challengeError) throw challengeError;

      // Sort by vote count
      const sortedEntries = (entries || [])
        .map(e => ({ ...e, voteCount: e.challenge_votes?.length || 0 }))
        .sort((a, b) => b.voteCount - a.voteCount);

      // Award points to top 3
      const pointsAwards = [
        { place: 1, points: challenge.first_place_points },
        { place: 2, points: challenge.second_place_points },
        { place: 3, points: challenge.third_place_points },
      ];

      for (let i = 0; i < Math.min(3, sortedEntries.length); i++) {
        const entry = sortedEntries[i];
        if (entry.voteCount > 0) {
          // Add points to winner
          const { data: userPoints } = await supabase
            .from("user_points")
            .select("total_points")
            .eq("user_id", entry.user_id)
            .single();

          if (userPoints) {
            await supabase
              .from("user_points")
              .update({ total_points: userPoints.total_points + pointsAwards[i].points })
              .eq("user_id", entry.user_id);
          } else {
            await supabase
              .from("user_points")
              .insert({ user_id: entry.user_id, total_points: pointsAwards[i].points });
          }

          // Record transaction
          await supabase.from("point_transactions").insert({
            user_id: entry.user_id,
            points: pointsAwards[i].points,
            transaction_type: "challenge_reward",
            description: `チャレンジ「${challenge.title}」${pointsAwards[i].place}位入賞`,
            reference_id: challengeId,
          });
        }
      }

      // Update challenge status
      const { error: updateError } = await supabase
        .from("challenges")
        .update({ status: "ended" })
        .eq("id", challengeId);

      if (updateError) throw updateError;

      return sortedEntries.slice(0, 3);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast({ title: "チャレンジが終了し、ポイントが付与されました" });
    },
    onError: (error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });
}
