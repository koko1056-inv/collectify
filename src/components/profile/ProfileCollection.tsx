
import React, { useState } from "react";
import { FilterBar } from "../FilterBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";
import { UserCollection } from "../UserCollection";
import { useCollectionLimitStatus } from "@/hooks/useCollectionLimit";
import { Progress } from "@/components/ui/progress";
import { Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function ProfileCollection({ userId }: { userId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const { user } = useAuth();
  const limitStatus = useCollectionLimitStatus();

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // 自分のプロフィールの場合のみ表示
  const isOwnProfile = user?.id === userId;

  return (
    <div className="space-y-4 my-0 mx-0 px-0 py-px">
      {isOwnProfile && limitStatus && (
        <div className="mx-4 p-3 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              コレクション枠
            </span>
            <span className="ml-auto text-sm text-muted-foreground">
              {limitStatus.currentCount} / {limitStatus.maxSlots}
            </span>
          </div>
          <Progress 
            value={limitStatus.usagePercent} 
            className="h-2"
          />
          {limitStatus.isAtLimit && (
            <p className="text-xs text-destructive mt-1">
              上限に達しています。ポイントショップで枠を追加できます。
            </p>
          )}
        </div>
      )}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        selectedContent={selectedContent}
        onContentChange={setSelectedContent}
        tags={allTags}
      />
      <UserCollection
        selectedTags={selectedTags}
        userId={userId}
      />
    </div>
  );
}
