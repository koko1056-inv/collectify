import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Challenge, ChallengeEntry } from "@/types/challenges";

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          *,
          profiles!user_id (username, avatar_url),
          official_items (id, title, image),
          challenge_entries (id)
        `)
        .in("status", ["active", "ended"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(challenge => ({
        ...challenge,
        _count: {
          entries: challenge.challenge_entries?.length || 0
        }
      })) as Challenge[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useChallenge(challengeId: string) {
  return useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          *,
          profiles!user_id (username, avatar_url),
          official_items (id, title, image)
        `)
        .eq("id", challengeId)
        .single();

      if (error) throw error;
      return data as Challenge;
    },
    enabled: !!challengeId,
  });
}

export function useChallengeEntries(challengeId: string) {
  return useQuery({
    queryKey: ["challenge-entries", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_entries")
        .select(`
          *,
          profiles!user_id (username, avatar_url),
          user_items!user_item_id (title, image),
          challenge_votes (id, user_id)
        `)
        .eq("challenge_id", challengeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(entry => ({
        ...entry,
        _count: {
          votes: entry.challenge_votes?.length || 0
        }
      })) as ChallengeEntry[];
    },
    enabled: !!challengeId,
    staleTime: 5 * 1000, // 5秒で再取得可能に（リアルタイム性向上）
    refetchInterval: 10 * 1000, // 10秒ごとに自動更新
  });
}
