
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile } from "@/types";

export function useThemeManagement(
  userProfile: UserProfile | null,
  userId: string | null | undefined,
  selectedTags: string[]
) {
  const [themes, setThemes] = useState<string[]>([]);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // テーマを更新する
  const { mutate: updateThemes } = useMutation({
    mutationFn: async (newThemes: string[]) => {
      if (!userId) throw new Error("ユーザーIDが必要です");
      
      const { error } = await supabase
        .from("profiles")
        .update({ themes: newThemes })
        .eq("id", userId);
      
      if (error) throw error;
      return newThemes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
    },
    onError: (error) => {
      console.error("テーマの更新に失敗しました:", error);
      toast.error("テーマの更新に失敗しました");
    },
  });

  // アイテムのテーマを更新する
  const { mutate: updateItemTheme } = useMutation({
    mutationFn: async ({ itemId, theme }: { itemId: string; theme: string | null }) => {
      if (!userId) throw new Error("ユーザーIDが必要です");
      
      const { error } = await supabase
        .from("user_items")
        .update({ theme: theme })
        .eq("id", itemId)
        .eq("user_id", userId);
      
      if (error) throw error;
      return { itemId, theme };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-items", userId, selectedTags] });
      toast.success("テーマを更新しました");
    },
    onError: (error) => {
      console.error("テーマの更新に失敗しました:", error);
      toast.error("テーマの更新に失敗しました");
    },
  });

  // テーマリストを設定
  useEffect(() => {
    if (userProfile && userProfile.themes) {
      setThemes(userProfile.themes);
    }
  }, [userProfile]);

  // テーマを追加
  const handleAddTheme = (theme: string) => {
    if (!themes.includes(theme)) {
      const newThemes = [...themes, theme];
      setThemes(newThemes);
      updateThemes(newThemes);
      toast.success(`テーマ「${theme}」を追加しました`);
    }
  };

  // テーマを削除
  const handleRemoveTheme = (theme: string) => {
    const newThemes = themes.filter(t => t !== theme);
    setThemes(newThemes);
    updateThemes(newThemes);
    
    // 削除されたテーマを持つアイテムのテーマをクリア
    if (userId) {
      supabase
        .from("user_items")
        .update({ theme: null })
        .eq("user_id", userId)
        .eq("theme", theme)
        .then(({ error }) => {
          if (error) {
            console.error("テーマの削除に失敗しました:", error);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ["user-items", userId, selectedTags] });
        });
    }
    
    if (activeTheme === theme) {
      setActiveTheme(null);
    }
    
    toast.success(`テーマ「${theme}」を削除しました`);
  };

  // テーマ名を変更
  const handleRenameTheme = (oldName: string, newName: string) => {
    if (themes.includes(newName)) {
      toast.error(`テーマ「${newName}」は既に存在します`);
      return;
    }
    
    const newThemes = themes.map(t => t === oldName ? newName : t);
    setThemes(newThemes);
    updateThemes(newThemes);
    
    // 古いテーマ名を持つアイテムのテーマ名を更新
    if (userId) {
      supabase
        .from("user_items")
        .update({ theme: newName })
        .eq("user_id", userId)
        .eq("theme", oldName)
        .then(({ error }) => {
          if (error) {
            console.error("テーマ名の変更に失敗しました:", error);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ["user-items", userId, selectedTags] });
        });
    }
    
    if (activeTheme === oldName) {
      setActiveTheme(newName);
    }
    
    toast.success(`テーマ名を「${oldName}」から「${newName}」に変更しました`);
  };

  return {
    themes,
    activeTheme,
    setActiveTheme,
    updateItemTheme,
    handleAddTheme,
    handleRemoveTheme,
    handleRenameTheme
  };
}
