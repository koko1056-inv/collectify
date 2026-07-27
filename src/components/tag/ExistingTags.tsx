import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExistingTagsProps {
  itemIds: string[];
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function ExistingTags({ itemIds, isUserItem = false, isCategory = false }: ExistingTagsProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: existingTags = [] } = useQuery({
    queryKey: ["tags", { isCategory }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("is_category", isCategory)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSelectExistingTag = async (tagId: string, tagName: string) => {
    try {
      const tagsToInsert = itemIds.map(itemId => ({
        tag_id: tagId,
        ...(isUserItem ? { user_item_id: itemId } : { official_item_id: itemId })
      }));

      const { error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .insert(tagsToInsert);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: isUserItem ? ["user-item-tags", itemIds] : ["item-tags", itemIds],
      });

      toast.success(isCategory ? t("tagManage.existing.categoryAdded") : t("tagManage.toast.tagAdded"), {
        description: `${t("tagManage.existing.addedToItemsPrefix")}${tagName}${t("tagManage.existing.addedToItemsMid")}${itemIds.length}${t("tagManage.existing.addedToItemsSuffix")}`,
      });
    } catch (error) {
      console.error("Error adding existing tag:", error);
      toast.error(t("tagManage.common.error"), {
        description: isCategory ? t("tagManage.existing.categoryAddFailed") : t("tagManage.common.tagAddFailed"),
      });
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{isCategory ? t("tagManage.existing.categoriesHeading") : t("tagManage.existing.tagsHeading")}</h4>
      <div className="flex flex-wrap gap-2">
        {existingTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="cursor-pointer hover:bg-secondary"
            onClick={() => handleSelectExistingTag(tag.id, tag.name)}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}