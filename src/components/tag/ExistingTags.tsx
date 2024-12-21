import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ExistingTagsProps {
  itemId: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function ExistingTags({ itemId, isUserItem = false, isCategory = false }: ExistingTagsProps) {
  const { toast } = useToast();
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
      const { error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .insert(
          isUserItem
            ? [{ user_item_id: itemId, tag_id: tagId }]
            : [{ official_item_id: itemId, tag_id: tagId }]
        );

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: isUserItem ? ["user-item-tags", itemId] : ["item-tags", itemId],
      });

      toast({
        title: isCategory ? "カテゴリを追加しました" : "タグを追加しました",
        description: `${tagName}をアイテムに追加しました。`,
      });
    } catch (error) {
      console.error("Error adding existing tag:", error);
      toast({
        title: "エラー",
        description: isCategory ? "カテゴリの追加に失敗しました。" : "タグの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{isCategory ? "既存のカテゴリ" : "既存のタグ"}</h4>
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