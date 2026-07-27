
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { addTagToItem } from '@/utils/tag/tag-mutations';
import { TagCategory } from '@/types/tag';
import { useLanguage } from "@/contexts/LanguageContext";

interface TagInputFieldProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  itemIds: string[];
  isUserItem?: boolean;
  onClose: () => void;
  category: TagCategory;
}

export function TagInputField({ 
  selectedTags, 
  onTagsChange,
  itemIds,
  isUserItem = false,
  onClose,
  category
}: TagInputFieldProps) {
  const [tagInput, setTagInput] = useState("");
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();

      // タグが既に選択済みかチェック
      if (selectedTags.includes(newTag)) {
        toast(t("tagManage.input.notice"), {
          description: t("tagManage.input.alreadyAdded"),
        });
        setTagInput("");
        return;
      }

      if (newTag.length > 50) {
        toast.error(t("tagManage.common.error"), {
          description: t("tagManage.input.tooLong"),
        });
        return;
      }

      try {
        // タグが存在するか確認
        const { data: existingTag, error: searchError } = await supabase
          .from("tags")
          .select("*")
          .eq("name", newTag)
          .eq("category", category)
          .maybeSingle();

        if (searchError) throw searchError;

        let tagId;
        if (!existingTag) {
          // 新しいタグを作成
          const { data: newTagData, error: createError } = await supabase
            .from("tags")
            .insert([{ 
              name: newTag,
              category: category 
            }])
            .select()
            .single();

          if (createError) throw createError;
          tagId = newTagData.id;
          console.log(`Created new tag: ${newTag} (${tagId})`);
        } else {
          tagId = existingTag.id;
          console.log(`Using existing tag: ${newTag} (${tagId})`);
        }

        // アイテムにタグを追加
        for (const itemId of itemIds) {
          await addTagToItem(itemId, tagId, isUserItem);
        }

        // ローカルステートを更新
        onTagsChange([...selectedTags, newTag]);

        // キャッシュを更新
        await queryClient.invalidateQueries({ 
          queryKey: ["current-tags", itemIds]
        });
        await queryClient.invalidateQueries({ 
          queryKey: ["tags", category]
        });

        setTagInput("");
        
        toast.success(t("tagManage.toast.tagAdded"), {
          description: `${t("tagManage.common.addedPrefix")}${newTag}${t("tagManage.common.addedSuffixDot")}`,
        });
      } catch (error) {
        console.error("Error adding tag:", error);
        toast.error(t("tagManage.common.error"), {
          description: t("tagManage.common.tagAddFailed"),
        });
      }
    }
  };

  return (
    <Input
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={handleAddTag}
      placeholder={t("tagManage.input.placeholder")}
      maxLength={50}
    />
  );
}
