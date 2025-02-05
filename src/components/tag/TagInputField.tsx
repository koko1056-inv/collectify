import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { addTagToItem } from '@/utils/tag-operations';

interface TagInputFieldProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagInputField({ selectedTags, onTagsChange }: TagInputFieldProps) {
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
    <Input
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={handleAddTag}
      placeholder="タグを入力してEnterを押してください"
      maxLength={50}
    />
  );
}