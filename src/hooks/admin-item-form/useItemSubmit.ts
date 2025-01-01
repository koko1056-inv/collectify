import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseItemSubmitProps {
  formData: {
    title: string;
    description: string;
  };
  uploadImage: () => Promise<string>;
  selectedTags: string[];
  resetForm: () => void;
}

export function useItemSubmit({
  formData,
  uploadImage,
  selectedTags,
  resetForm,
}: UseItemSubmitProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください。",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const imageUrl = await uploadImage();

      const { data: itemData, error: itemError } = await supabase
        .from("official_items")
        .insert([
          {
            ...formData,
            image: imageUrl,
            price: "0",
            release_date: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // Process tags
      if (selectedTags.length > 0) {
        for (const tagName of selectedTags) {
          const { data: existingTag, error: tagError } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .maybeSingle();

          if (tagError) throw tagError;

          let tagId;
          if (!existingTag) {
            const { data: newTag, error: createTagError } = await supabase
              .from("tags")
              .insert([{ name: tagName }])
              .select()
              .single();

            if (createTagError) throw createTagError;
            tagId = newTag.id;
          } else {
            tagId = existingTag.id;
          }

          const { error: relationError } = await supabase
            .from("item_tags")
            .insert([{
              official_item_id: itemData.id,
              tag_id: tagId,
            }]);

          if (relationError) throw relationError;
        }
      }

      toast({
        title: "アイテムを追加しました",
        description: "公式グッズリストに新しいアイテムが追加されました。",
      });

      resetForm();
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "エラー",
        description: "アイテムの追加に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit,
  };
}