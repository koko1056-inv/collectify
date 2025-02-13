
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookMarked } from "lucide-react";

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

  const { data: collectionCount = 0 } = useQuery({
    queryKey: ["collection-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId);
      
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="w-full mt-4 mb-6">
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div className="flex flex-col">
          <span className="text-xl font-bold">{profile?.following_count || 0}</span>
          <span className="text-sm text-gray-600">フォロー中</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold">{profile?.followers_count || 0}</span>
          <span className="text-sm text-gray-600">フォロワー</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold">{collectionCount}</span>
          <span className="text-sm text-gray-600">コレクション</span>
        </div>
      </div>
    </div>
  );
}
