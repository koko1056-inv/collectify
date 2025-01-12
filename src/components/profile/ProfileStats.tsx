import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfileStatsProps {
  userId: string;
}

export function ProfileStats({ userId }: ProfileStatsProps) {
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("followers_count, following_count")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex gap-4 text-sm text-gray-600">
      <div>
        <span className="font-bold">{profile?.followers_count || 0}</span>{" "}
        フォロワー
      </div>
      <div>
        <span className="font-bold">{profile?.following_count || 0}</span>{" "}
        フォロー中
      </div>
    </div>
  );
}