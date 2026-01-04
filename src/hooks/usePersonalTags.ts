import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PersonalTag {
  id: string;
  tag_name: string;
  user_item_id: string;
  created_at: string;
}

export function usePersonalTags(userItemId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      if (!user) throw new Error("ログインが必要です");
      
      const { error } = await supabase
        .from("user_personal_tags")
        .insert({
          user_id: user.id,
          user_item_id: userItemId,
          tag_name: tagName.trim(),
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("このタグは既に追加されています");
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
      toast.error("タグの削除に失敗しました");
    },
  });

  return {
    personalTags,
    allUserTags,
    isLoading,
    addTag,
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
