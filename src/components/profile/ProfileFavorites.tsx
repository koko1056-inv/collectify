
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CategoryTagSelect } from "@/components/tag/CategoryTagSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileFavoritesProps {
  userId: string;
  isOwnProfile: boolean;
}

export function ProfileFavorites({ userId, isOwnProfile }: ProfileFavoritesProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("favorite_tags")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile?.favorite_tags) {
      setSelectedTags(profile.favorite_tags);
    }
  }, [profile]);

  const handleTagChange = (value: string | null) => {
    if (!value) return;
    if (!selectedTags.includes(value)) {
      setSelectedTags([...selectedTags, value]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ favorite_tags: selectedTags })
        .eq("id", userId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });

      toast({
        title: "保存しました",
        description: "お気に入りコンテンツを更新しました。",
      });
    } catch (error) {
      console.error("Error saving favorite tags:", error);
      toast({
        title: "エラー",
        description: "保存に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const { data: selectedTagDetails = [] } = useQuery({
    queryKey: ["selected-tags", selectedTags],
    queryFn: async () => {
      if (!selectedTags.length) return [];
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .in("name", selectedTags);

      if (error) throw error;
      return data || [];
    },
    enabled: selectedTags.length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>推しコンテンツ</CardTitle>
        <CardDescription>お気に入りのコンテンツを追加しましょう</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwnProfile && (
          <div className="space-y-4">
            <CategoryTagSelect
              category="character"
              label="キャラクター"
              value={null}
              onChange={handleTagChange}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTagDetails
                .filter(tag => tag.category === "character")
                .map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full"
                  >
                    <span>{tag.name}</span>
                    {isOwnProfile && (
                      <button
                        onClick={() => handleRemoveTag(tag.name)}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
            </div>
            <Button onClick={handleSave} className="w-full">
              保存する
            </Button>
          </div>
        )}
        {!isOwnProfile && selectedTagDetails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTagDetails.map((tag) => (
              <div
                key={tag.id}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full"
              >
                {tag.name}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
