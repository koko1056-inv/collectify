import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface TagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagInput({ selectedTags, onTagsChange }: TagInputProps) {
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();

      if (newTag.length > 50) {
        toast({
          title: "エラー",
          description: "タグは50文字以内で入力してください。",
          variant: "destructive",
        });
        return;
      }

      if (!selectedTags.includes(newTag)) {
        try {
          const { data: existingTag } = await supabase
            .from("tags")
            .select("*")
            .eq("name", newTag)
            .maybeSingle();

          let tagId;
          if (!existingTag) {
            const { data: newTagData, error: insertError } = await supabase
              .from("tags")
              .insert([{ name: newTag }])
              .select()
              .single();

            if (insertError) throw insertError;
            tagId = newTagData.id;
          } else {
            tagId = existingTag.id;
          }

          onTagsChange([...selectedTags, newTag]);
          setTagInput("");

          queryClient.invalidateQueries({ queryKey: ["tags"] });

          toast({
            title: "タグを追加しました",
            description: `${newTag}を追加しました。`,
          });
        } catch (error) {
          console.error("Error adding tag:", error);
          toast({
            title: "エラー",
            description: "タグの追加に失敗しました。",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "注意",
          description: "このタグは既に追加されています。",
          variant: "default",
        });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const tagToDelete = existingTags.find(tag => tag.name === tagToRemove);
      
      if (tagToDelete) {
        onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));

        toast({
          title: "タグを削除しました",
          description: `${tagToRemove}を削除しました。`,
        });
      }
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: "タグの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="tags" className="text-sm font-medium">
        タグ
      </label>
      <Input
        id="tags"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleAddTag}
        placeholder="タグを入力してEnterを押してください"
        maxLength={50}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {existingTags.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-1">既存のタグ:</p>
          <div className="flex flex-wrap gap-2">
            {existingTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="cursor-pointer hover:bg-secondary"
                onClick={() => {
                  if (!selectedTags.includes(tag.name)) {
                    onTagsChange([...selectedTags, tag.name]);
                  }
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}