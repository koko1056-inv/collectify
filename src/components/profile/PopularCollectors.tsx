
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserCard } from "./UserCard";
import { Skeleton } from "@/components/ui/skeleton";

export function PopularCollectors() {
  const { data: popularUsers, isLoading } = useQuery({
    queryKey: ["popular-collectors"],
    queryFn: async () => {
      // コレクション数が多いユーザーを取得（ここでは簡易的に実装）
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, followers_count, following_count")
        .order("followers_count", { ascending: false })
        .limit(5);

      if (error) throw error;

      // 各ユーザーのコレクション数を取得
      if (profiles && profiles.length > 0) {
        const profilesWithCollectionCount = await Promise.all(
          profiles.map(async (profile) => {
            const { count } = await supabase
              .from("user_items")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.id);

            return {
              ...profile,
              collectionCount: count || 0,
            };
          })
        );

        return profilesWithCollectionCount;
      }

      return [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-9 w-full mt-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-3">人気のコレクター</h2>
      {popularUsers && popularUsers.length > 0 ? (
        popularUsers.map((user) => (
          <UserCard
            key={user.id}
            id={user.id}
            username={user.username}
            bio={user.bio}
            avatar_url={user.avatar_url}
            followersCount={user.followers_count || 0}
            followingCount={user.following_count || 0}
            collectionCount={user.collectionCount}
          />
        ))
      ) : (
        <p className="text-gray-500 p-4">表示するコレクターがいません</p>
      )}
    </div>
  );
}
