import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BinderPage, BinderItem, BinderDecoration } from "@/types/binder";
import { useToast } from "@/hooks/use-toast";

export function useBinder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // バインダーページ一覧を取得
  const { data: binderPages = [], isLoading: isLoadingPages } = useQuery<BinderPage[]>({
    queryKey: ["binder-pages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("binder_pages")
        .select("*")
        .eq("user_id", user!.id)
        .order("page_order");

      if (error) throw error;
      return data || [];
    },
  });

  // 特定のバインダーページのアイテムを取得
  const getBinderItems = (pageId: string) => {
    return useQuery<BinderItem[]>({
      queryKey: ["binder-items", pageId],
      enabled: !!pageId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("binder_items")
          .select("*")
          .eq("binder_page_id", pageId)
          .order("z_index");

        if (error) throw error;
        return data || [];
      },
    });
  };

  // 特定のバインダーページのデコレーションを取得
  const getBinderDecorations = (pageId: string) => {
    return useQuery<BinderDecoration[]>({
      queryKey: ["binder-decorations", pageId],
      enabled: !!pageId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("binder_decorations")
          .select("*")
          .eq("binder_page_id", pageId)
          .order("z_index");

        if (error) throw error;
        return (data || []) as BinderDecoration[];
      },
    });
  };

  // 新しいバインダーページを作成
  const createPage = useMutation({
    mutationFn: async (title: string) => {
      const maxOrder = binderPages.length > 0 
        ? Math.max(...binderPages.map(p => p.page_order))
        : -1;

      const { data, error } = await supabase
        .from("binder_pages")
        .insert({
          user_id: user!.id,
          title,
          page_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["binder-pages"] });
      toast({
        title: "バインダーページを作成しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "バインダーページの作成に失敗しました",
        variant: "destructive",
      });
    },
  });

  // バインダーページを更新
  const updatePage = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BinderPage> }) => {
      const { data, error } = await supabase
        .from("binder_pages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["binder-pages"] });
    },
  });

  // バインダーページを削除
  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("binder_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["binder-pages"] });
      toast({
        title: "バインダーページを削除しました",
      });
    },
  });

  // アイテムを追加
  const addItem = useMutation({
    mutationFn: async (item: Omit<BinderItem, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("binder_items")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["binder-items", variables.binder_page_id] });
    },
  });

  // アイテムを更新
  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BinderItem> }) => {
      const { data, error } = await supabase
        .from("binder_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["binder-items", data.binder_page_id] });
    },
  });

  // アイテムを削除
  const deleteItem = useMutation({
    mutationFn: async ({ id, pageId }: { id: string; pageId: string }) => {
      const { error } = await supabase
        .from("binder_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return pageId;
    },
    onSuccess: (pageId) => {
      queryClient.invalidateQueries({ queryKey: ["binder-items", pageId] });
    },
  });

  // デコレーションを追加
  const addDecoration = useMutation({
    mutationFn: async (decoration: Omit<BinderDecoration, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("binder_decorations")
        .insert(decoration)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["binder-decorations", variables.binder_page_id] });
    },
  });

  // デコレーションを更新
  const updateDecoration = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BinderDecoration> }) => {
      const { data, error } = await supabase
        .from("binder_decorations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["binder-decorations", data.binder_page_id] });
    },
  });

  // デコレーションを削除
  const deleteDecoration = useMutation({
    mutationFn: async ({ id, pageId }: { id: string; pageId: string }) => {
      const { error } = await supabase
        .from("binder_decorations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return pageId;
    },
    onSuccess: (pageId) => {
      queryClient.invalidateQueries({ queryKey: ["binder-decorations", pageId] });
    },
  });

  return {
    binderPages,
    isLoadingPages,
    getBinderItems,
    getBinderDecorations,
    createPage,
    updatePage,
    deletePage,
    addItem,
    updateItem,
    deleteItem,
    addDecoration,
    updateDecoration,
    deleteDecoration,
  };
}
