import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Poll } from "@/types/polls";

export function usePolls() {
  return useQuery({
    queryKey: ["polls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select(`
          *,
          poll_options (
            id,
            text,
            image_url,
            official_item_id,
            official_items (
              title,
              image
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 投票数とプロフィールを取得
      const pollsWithCounts = await Promise.all(
        (data || []).map(async (poll) => {
          // プロフィール情報を取得
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", poll.user_id)
            .single();

          const optionsWithCounts = await Promise.all(
            (poll.poll_options || []).map(async (option) => {
              const { count } = await supabase
                .from("poll_votes")
                .select("*", { count: "exact", head: true })
                .eq("poll_option_id", option.id);

              return {
                ...option,
                _count: { poll_votes: count || 0 },
              };
            })
          );

          return {
            ...poll,
            profiles: profileData || undefined,
            poll_options: optionsWithCounts,
          } as Poll;
        })
      );

      return pollsWithCounts;
    },
    staleTime: 1000 * 60 * 5,
  });
}
