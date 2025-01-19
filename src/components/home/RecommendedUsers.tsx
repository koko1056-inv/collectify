import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function RecommendedUsers() {
  const { user } = useAuth();

  const { data: recommendedUsers = [], isLoading } = useQuery({
    queryKey: ["recommended-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .order("followers_count", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[100px]">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="w-20 h-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {recommendedUsers.map((profile) => (
        <Link
          key={profile.id}
          to={`/user/${profile.id}`}
          className="flex flex-col items-center gap-2 min-w-[100px]"
        >
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile.avatar_url} alt={profile.username} />
            <AvatarFallback>{profile.username[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-center">
            {profile.username}
          </span>
        </Link>
      ))}
    </div>
  );
}