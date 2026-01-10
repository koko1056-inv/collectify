import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Challenge, ChallengeEntry } from "@/types/challenges";
import { useEffect } from "react";

export function useChallenges() {
  const queryClient = useQueryClient();

  const query = useQuery({
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

  useEffect(() => {
    const channel = supabase
      .channel('challenges-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => {
        queryClient.invalidateQueries({ queryKey: ["challenges"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
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
  const queryClient = useQueryClient();

  const query = useQuery({
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

  useEffect(() => {
    if (!challengeId) return;

    const channel = supabase
      .channel(`challenge-entries-${challengeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_entries', filter: `challenge_id=eq.${challengeId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["challenge-entries", challengeId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_votes', filter: `challenge_id=eq.${challengeId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["challenge-entries", challengeId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, queryClient]);

  return query;
}
