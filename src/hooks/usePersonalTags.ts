import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PersonalTag {
  id: string;
  tag_name: string;
  user_item_id: string;
  created_at: string;
}

export function usePersonalTags(userItemId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  // アイテムのマイタグを取得
  const { data: personalTags = [], isLoading } = useQuery({
    queryKey: ["personal-tags", userItemId],
    queryFn: async () => {
      if (!userItemId) return [];
      const { data, error } = await supabase
        .from("user_personal_tags")
        .select("*")
        .eq("user_item_id", userItemId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as PersonalTag[];
    },
    enabled: !!user && !!userItemId,
  });

  // ユーザーの全マイタグ名を取得（サジェスト用）
  const { data: allUserTags = [] } = useQuery({
    queryKey: ["all-personal-tags", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_personal_tags")
        .select("tag_name")
        .eq("user_id", user.id);

      if (error) throw error;
      
      // 重複を削除してユニークなタグ名のリストを返す
      const uniqueTags = [...new Set(data.map(t => t.tag_name))];
      return uniqueTags;
    },
    enabled: !!user,
  });

  // マイタグを追加
  const addTag = useMutation({
    mutationFn: async ({ userItemId, tagName }: { userItemId: string; tagName: string }) => {
      if (!user) throw new Error(t("notices.common.loginRequired"));
      
      const { error } = await supabase
        .from("user_personal_tags")
        .insert({
          user_id: user.id,
          user_item_id: userItemId,
          tag_name: tagName.trim(),
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error(t("notices.tags.alreadyAdded"));
        }
        throw error;
      }
    },
    onSuccess: (_, { userItemId }) => {
      queryClient.invalidateQueries({ queryKey: ["personal-tags", userItemId] });
      queryClient.invalidateQueries({ queryKey: ["all-personal-tags", user?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // マイタグを削除
  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("user_personal_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-tags", userItemId] });
      queryClient.invalidateQueries({ queryKey: ["all-personal-tags", user?.id] });
    },
    onError: () => {
      toast.error(t("notices.tags.deleteFailed"));
    },
  });

  // 複数アイテムへ同じタグを一括追加
  const addTagBulk = useMutation({
    mutationFn: async ({ userItemIds, tagName }: { userItemIds: string[]; tagName: string }) => {
      if (!user) throw new Error(t("notices.common.loginRequired"));
      const trimmed = tagName.trim();
      if (!trimmed) throw new Error(t("notices.tags.nameRequired"));
      if (userItemIds.length === 0) throw new Error(t("notices.tags.noItemsSelected"));

      const rows = userItemIds.map((id) => ({
        user_id: user.id,
        user_item_id: id,
        tag_name: trimmed,
      }));

      // 既存と重複する (user_item_id, tag_name) は無視する
      const { error, data } = await supabase
        .from("user_personal_tags")
        .upsert(rows, {
          onConflict: "user_item_id,tag_name",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) throw error;
      return { addedCount: data?.length ?? 0, totalCount: userItemIds.length };
    },
    onSuccess: ({ addedCount, totalCount }) => {
      queryClient.invalidateQueries({ queryKey: ["all-personal-tags", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["personal-tags"] });
      queryClient.invalidateQueries({ queryKey: ["personal-tag-filter"] });
      const skipped = totalCount - addedCount;
      if (addedCount === 0) {
        toast.success(t("notices.tags.alreadyTagged"));
      } else if (skipped > 0) {
        toast.success(t("notices.tags.bulkAddedPartial", { added: addedCount, skipped }));
      } else {
        toast.success(t("notices.tags.bulkAdded", { added: addedCount }));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    personalTags,
    allUserTags,
    isLoading,
    addTag,
    addTagBulk,
    removeTag,
  };
}

// コレクション内のマイタグ検索用
export function usePersonalTagSearch() {
  const { user } = useAuth();

  const searchByPersonalTag = async (tagName: string) => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from("user_personal_tags")
      .select(`
        user_item_id,
        user_items (
          id,
          title,
          image,
          content_name
        )
      `)
      .eq("user_id", user.id)
      .ilike("tag_name", `%${tagName}%`);

    if (error) throw error;
    return data;
  };

  return { searchByPersonalTag };
}
