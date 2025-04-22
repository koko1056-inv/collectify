import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserCard } from "./UserCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PopularCollectors() {
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: popularUsers, isLoading } = useQuery({
    queryKey: ["popular-collectors", selectedContent],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, followers_count, following_count");

      if (selectedContent) {
        query = query.contains('interests', [selectedContent]);
      }

      const { data: profiles, error } = await query
        .order("followers_count", { ascending: false })
        .limit(5);

      if (error) throw error;

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

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pl-4">
        <h2 className="text-lg font-semibold">人気のコレクター</h2>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setIsFilterOpen(true)}
        >
          フィルター
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 pl-4 mb-2">
        <Button
          variant={selectedContent === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedContent(null)}
        >
          すべて
        </Button>
        {contentNames.map((content) => (
          <Button
            key={content.id}
            variant={selectedContent === content.name ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedContent(content.name)}
          >
            {content.name}
          </Button>
        ))}
      </div>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>推しコンテンツを選択</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedContent === null ? "default" : "outline"}
                className="w-full justify-start text-sm"
                onClick={() => {
                  setSelectedContent(null);
                  setIsFilterOpen(false);
                }}
              >
                すべて
              </Button>
              {contentNames.map((content) => (
                <Button
                  key={content.id}
                  variant={selectedContent === content.name ? "default" : "outline"}
                  className="w-full justify-start text-sm"
                  onClick={() => {
                    setSelectedContent(content.name);
                    setIsFilterOpen(false);
                  }}
                >
                  {content.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {isLoading ? (
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
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
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
      )}
    </div>
  );
}
