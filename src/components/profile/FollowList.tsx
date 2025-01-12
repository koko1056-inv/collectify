import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

interface FollowListProps {
  userId: string;
  type: "followers" | "following";
}

export function FollowList({ userId, type }: FollowListProps) {
  const { data: users } = useQuery({
    queryKey: ["follow-list", userId, type],
    queryFn: async () => {
      if (type === "followers") {
        const { data } = await supabase
          .from("follows")
          .select(`
            follower:profiles!follows_follower_id_fkey (
              id,
              username,
              avatar_url
            )
          `)
          .eq("following_id", userId);
        return data?.map(item => item.follower) ?? [];
      } else {
        const { data } = await supabase
          .from("follows")
          .select(`
            following:profiles!follows_following_id_fkey (
              id,
              username,
              avatar_url
            )
          `)
          .eq("follower_id", userId);
        return data?.map(item => item.following) ?? [];
      }
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {type === "followers" ? "フォロワー" : "フォロー中"}
      </h3>
      <div className="grid gap-4">
        {users?.map((user) => (
          <Link
            key={user.id}
            to={`/user/${user.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
          >
            <Avatar>
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback>{user.username[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{user.username}</span>
          </Link>
        ))}
        {users?.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            {type === "followers" ? "フォロワーはいません" : "フォローしているユーザーはいません"}
          </p>
        )}
      </div>
    </div>
  );
}