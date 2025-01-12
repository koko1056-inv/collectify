import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface FollowListProps {
  userId: string;
  type: "followers" | "following";
}

export function FollowList({ userId, type }: FollowListProps) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchFollows = async () => {
      const { data: follows, error } = await supabase
        .from("follows")
        .select(
          type === "followers"
            ? "follower:profiles!follows_follower_id_fkey(id, username, avatar_url, bio)"
            : "following:profiles!follows_following_id_fkey(id, username, avatar_url, bio)"
        )
        .eq(type === "followers" ? "following_id" : "follower_id", userId);

      if (error) {
        console.error("Error fetching follows:", error);
        return;
      }

      const profiles = follows?.map((follow: any) =>
        type === "followers" ? follow.follower : follow.following
      ) || [];
      
      setProfiles(profiles);
      setLoading(false);
    };

    fetchFollows();
  }, [userId, type]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.length === 0 ? (
        <p className="text-gray-500">
          {type === "followers" ? "フォロワーはいません" : "フォロー中のユーザーはいません"}
        </p>
      ) : (
        profiles.map((profile) => (
          <Link
            key={profile.id}
            to={`/user/${profile.id}`}
            className="flex flex-col gap-2 p-3 rounded-lg hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <img
                  src={profile.avatar_url || "/placeholder.svg"}
                  alt={profile.username}
                  className="object-cover"
                />
              </Avatar>
              <span className="font-medium">{profile.username}</span>
            </div>
            {profile.bio && (
              <p className="text-sm text-gray-600 line-clamp-2">{profile.bio}</p>
            )}
          </Link>
        ))
      )}
    </div>
  );
}