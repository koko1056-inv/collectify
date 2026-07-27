import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addTagToItem, removeTagFromItem } from "@/utils/tag/tag-mutations";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemDetailsFormProps {
  itemId: string;
  isUserItem: boolean;
  initialData: any;
  editedData: any;
  onEditComplete: () => void;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
}

export function ItemDetailsForm({
  itemId,
  isUserItem,
  initialData,
  editedData,
  onEditComplete,
  isSaving,
  setIsSaving,
}: ItemDetailsFormProps) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const table = isUserItem ? "user_items" : "official_items";
      const updateData = {
        title: editedData.title,
        description: editedData.description,
        image: editedData.image,
        [isUserItem ? "prize" : "price"]: editedData.price,
        content_name: editedData.content_name,
      };

      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", itemId);

      if (updateError) throw updateError;

      // タグの更新処理
      const updateTag = async (newTag: string | null, oldTag: string | null, category: string) => {
        if (oldTag && (!newTag || newTag !== oldTag)) {
          // 古いタグを削除
          await removeTagFromItem(oldTag, itemId, isUserItem);
        }
        if (newTag && newTag !== oldTag) {
          // 新しいタグを追加
          await addTagToItem(itemId, newTag, isUserItem);
        }
      };

      // 各カテゴリのタグを更新
      if (!isUserItem) {
        const currentTags = initialData.tags || [];
        const getTagIdByName = (name: string | null, category: string) => {
          return currentTags.find(
            (tag: any) => tag.tags?.name === name && tag.tags?.category === category
          )?.tag_id;
        };

        await Promise.all([
          updateTag(
            editedData.typeTag,
            getTagIdByName(initialData.typeTag, 'type'),
            'type'
          ),
          updateTag(
            editedData.characterTag,
            getTagIdByName(initialData.characterTag, 'character'),
            'character'
          ),
          updateTag(
            editedData.seriesTag,
            getTagIdByName(initialData.seriesTag, 'series'),
            'series'
          ),
        ]);
      }

      await queryClient.invalidateQueries({ queryKey: ["official-items"] });
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast.success(t("itemDetails.save.updateSuccess"), {
        description: t("itemDetails.save.updateSuccessDescription"),
      });

      onEditComplete();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.save.updateFailed"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-end space-x-4">
        <Button
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? t("itemDetails.common.saving") : t("itemDetails.common.save")}
        </Button>
      </div>
    </form>
  );
}
