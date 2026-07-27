import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Check, X, Pencil, Tags, User, Layers, Link2, Search, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface ContentTagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContentTagManageModal({ isOpen, onClose }: ContentTagManageModalProps) {
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<"character" | "series">("character");
  const [newTagName, setNewTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [selectedUnlinkedTags, setSelectedUnlinkedTags] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  // Supabase Realtimeでtagsとitem_tagsの変更を監視
  useEffect(() => {
    const tagsChannel = supabase
      .channel('content-tags-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETEすべてを監視
          schema: 'public',
          table: 'tags'
        },
        (payload) => {
          console.log('[ContentTagManageModal] tags changed:', payload);
          // タグ関連のクエリを無効化して再フェッチ
          queryClient.invalidateQueries({ queryKey: ["content-tags"] });
          queryClient.invalidateQueries({ queryKey: ["unlinked-tags"] });
          queryClient.invalidateQueries({ queryKey: ["tags"] });
          queryClient.invalidateQueries({ queryKey: ["tags-by-category"] });
          queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_tags'
        },
        (payload) => {
          console.log('[ContentTagManageModal] item_tags changed:', payload);
          // アイテムタグの変更も反映
          queryClient.invalidateQueries({ queryKey: ["content-tags"] });
          queryClient.invalidateQueries({ queryKey: ["unlinked-tags"] });
          queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tagsChannel);
    };
  }, [queryClient]);

  // コンテンツ一覧を取得
  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // 選択されたコンテンツに紐づくタグを取得
  const { data: tags = [] } = useQuery({
    queryKey: ["content-tags", selectedContent, selectedCategory],
    queryFn: async () => {
      if (!selectedContent) return [];

      // コンテンツIDを取得
      const content = contentNames.find(c => c.name === selectedContent);
      if (!content) return [];

      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", selectedCategory)
        .eq("content_id", content.id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedContent,
  });

  // コンテンツに紐づいていないタグを全て取得
  const { data: unlinkedTags = [] } = useQuery({
    queryKey: ["unlinked-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .is("content_id", null)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // タグ追加
  const addTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const content = contentNames.find(c => c.name === selectedContent);
      if (!content) throw new Error("コンテンツが見つかりません");

      const { data, error } = await supabase
        .from("tags")
        .insert([
          {
            name: tagName,
            category: selectedCategory,
            content_id: content.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // すべてのタグ関連のクエリを無効化
      queryClient.invalidateQueries({ queryKey: ["content-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      setNewTagName("");
      toast.success(t("tagManage.toast.tagAdded"));
    },
    onError: (error: any) => {
      toast.error(t("tagManage.toast.addFailedPrefix") + error.message);
    },
  });

  // タグ削除
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      // 関連するitem_tagsを削除
      const { error: itemTagsError } = await supabase
        .from("item_tags")
        .delete()
        .eq("tag_id", tagId);
      if (itemTagsError) throw itemTagsError;

      // 関連するuser_item_tagsを削除
      const { error: userItemTagsError } = await supabase
        .from("user_item_tags")
        .delete()
        .eq("tag_id", tagId);
      if (userItemTagsError) throw userItemTagsError;

      // 関連するoriginal_item_tagsを削除
      const { error: originalItemTagsError } = await supabase
        .from("original_item_tags")
        .delete()
        .eq("tag_id", tagId);
      if (originalItemTagsError) throw originalItemTagsError;

      // タグ本体を削除
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);
      if (error) throw error;
      return tagId;
    },
    onMutate: async (tagId) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ["content-tags"] });
      await queryClient.cancelQueries({ queryKey: ["unlinked-tags"] });
      await queryClient.cancelQueries({ queryKey: ["tags"] });
      await queryClient.cancelQueries({ queryKey: ["tags-by-category"] });
      await queryClient.cancelQueries({ queryKey: ["tags-with-count"] });

      // 現在のキャッシュを保存（ロールバック用）
      const content = contentNames.find(c => c.name === selectedContent);
      const contentId = content?.id;
      const previousContentTags = queryClient.getQueryData(["content-tags", selectedContent, selectedCategory]);
      const previousUnlinkedTags = queryClient.getQueryData(["unlinked-tags"]);
      const previousTags = queryClient.getQueryData(["tags"]);
      const previousTagsByCategory = contentId ? queryClient.getQueryData(["tags-by-category", selectedCategory, contentId]) : null;
      const previousTagsWithCount = queryClient.getQueryData(["tags-with-count", selectedContent]);

      // UIから即座に削除（楽観的更新）
      queryClient.setQueryData<any[]>(["content-tags", selectedContent, selectedCategory], (old) => 
        old ? old.filter(t => t.id !== tagId) : old
      );
      queryClient.setQueryData<any[]>(["unlinked-tags"], (old) => 
        old ? old.filter(t => t.id !== tagId) : old
      );
      queryClient.setQueryData<any[]>(["tags"], (old) => 
        old ? old.filter(t => t.id !== tagId) : old
      );
      if (contentId) {
        queryClient.setQueryData<any[]>(["tags-by-category", selectedCategory, contentId], (old) => 
          old ? old.filter(t => t.id !== tagId) : old
        );
      }
      queryClient.setQueryData<any[]>(["tags-with-count", selectedContent], (old) => 
        old ? old.filter(t => t.id !== tagId) : old
      );

      // ロールバック用データを返す
      return { previousContentTags, previousUnlinkedTags, previousTags, previousTagsByCategory, previousTagsWithCount, contentId };
    },
    onError: (_err, _tagId, context) => {
      // エラー時は元に戻す
      if (context?.previousContentTags) {
        queryClient.setQueryData(["content-tags", selectedContent, selectedCategory], context.previousContentTags);
      }
      if (context?.previousUnlinkedTags) {
        queryClient.setQueryData(["unlinked-tags"], context.previousUnlinkedTags);
      }
      if (context?.previousTags) {
        queryClient.setQueryData(["tags"], context.previousTags);
      }
      if (context?.contentId && context?.previousTagsByCategory) {
        queryClient.setQueryData(["tags-by-category", selectedCategory, context.contentId], context.previousTagsByCategory);
      }
      if (context?.previousTagsWithCount) {
        queryClient.setQueryData(["tags-with-count", selectedContent], context.previousTagsWithCount);
      }
      toast.error(t("tagManage.toast.deleteFailed"));
    },
    onSuccess: async () => {
      // バックグラウンドでクエリを無効化して最新データを取得
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["content-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["unlinked-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-by-category"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-with-count"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["official-items"], refetchType: "active" }),
      ]);
      toast.success(t("tagManage.toast.tagDeleted"));
    },
  });

  // タグを一括削除
  const deleteMultipleTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      // 関連するitem_tagsを削除
      const { error: itemTagsError } = await supabase
        .from("item_tags")
        .delete()
        .in("tag_id", tagIds);
      if (itemTagsError) throw itemTagsError;

      // 関連するuser_item_tagsを削除
      const { error: userItemTagsError } = await supabase
        .from("user_item_tags")
        .delete()
        .in("tag_id", tagIds);
      if (userItemTagsError) throw userItemTagsError;

      // 関連するoriginal_item_tagsを削除
      const { error: originalItemTagsError } = await supabase
        .from("original_item_tags")
        .delete()
        .in("tag_id", tagIds);
      if (originalItemTagsError) throw originalItemTagsError;

      // タグ本体を削除
      const { error } = await supabase
        .from("tags")
        .delete()
        .in("id", tagIds);
      if (error) throw error;
      return tagIds;
    },
    onMutate: async (tagIds) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ["content-tags"] });
      await queryClient.cancelQueries({ queryKey: ["unlinked-tags"] });
      await queryClient.cancelQueries({ queryKey: ["tags"] });
      await queryClient.cancelQueries({ queryKey: ["tags-by-category"] });
      await queryClient.cancelQueries({ queryKey: ["tags-with-count"] });

      // 現在のキャッシュを保存
      const content = contentNames.find(c => c.name === selectedContent);
      const contentId = content?.id;
      const previousContentTags = queryClient.getQueryData(["content-tags", selectedContent, selectedCategory]);
      const previousUnlinkedTags = queryClient.getQueryData(["unlinked-tags"]);
      const previousTags = queryClient.getQueryData(["tags"]);
      const previousTagsByCategory = contentId ? queryClient.getQueryData(["tags-by-category", selectedCategory, contentId]) : null;
      const previousTagsWithCount = queryClient.getQueryData(["tags-with-count", selectedContent]);

      // UIから即座に削除
      const filterOut = (old?: any[]) => old ? old.filter(t => !tagIds.includes(t.id)) : old;
      queryClient.setQueryData(["content-tags", selectedContent, selectedCategory], filterOut);
      queryClient.setQueryData(["unlinked-tags"], filterOut);
      queryClient.setQueryData(["tags"], filterOut);
      if (contentId) {
        queryClient.setQueryData(["tags-by-category", selectedCategory, contentId], filterOut);
      }
      queryClient.setQueryData(["tags-with-count", selectedContent], filterOut);

      return { previousContentTags, previousUnlinkedTags, previousTags, previousTagsByCategory, previousTagsWithCount, contentId };
    },
    onError: (_err, _tagIds, context) => {
      // エラー時は元に戻す
      if (context?.previousContentTags) {
        queryClient.setQueryData(["content-tags", selectedContent, selectedCategory], context.previousContentTags);
      }
      if (context?.previousUnlinkedTags) {
        queryClient.setQueryData(["unlinked-tags"], context.previousUnlinkedTags);
      }
      if (context?.previousTags) {
        queryClient.setQueryData(["tags"], context.previousTags);
      }
      if (context?.contentId && context?.previousTagsByCategory) {
        queryClient.setQueryData(["tags-by-category", selectedCategory, context.contentId], context.previousTagsByCategory);
      }
      if (context?.previousTagsWithCount) {
        queryClient.setQueryData(["tags-with-count", selectedContent], context.previousTagsWithCount);
      }
      toast.error(t("tagManage.toast.bulkDeleteFailed"));
    },
    onSuccess: async (tagIds) => {
      // バックグラウンドでクエリを無効化
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["content-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["unlinked-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-by-category"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-with-count"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["official-items"], refetchType: "active" }),
      ]);
      
      const tagCount = tagIds.length;
      setSelectedUnlinkedTags([]);
      toast.success(`${t("tagManage.toast.bulkDeletedPrefix")}${tagCount}${t("tagManage.toast.bulkDeletedSuffix")}`);
    },
  });

  // タグをコンテンツに紐づける
  const linkTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const content = contentNames.find(c => c.name === selectedContent);
      if (!content) throw new Error("コンテンツが見つかりません");

      const { error } = await supabase
        .from("tags")
        .update({ 
          content_id: content.id,
          category: selectedCategory 
        })
        .eq("id", tagId);

      if (error) throw error;
      return tagId;
    },
    onMutate: async (tagId) => {
      // キャンセル
      await queryClient.cancelQueries({ queryKey: ["content-tags"] });
      await queryClient.cancelQueries({ queryKey: ["unlinked-tags"] });

      // 現在のキャッシュを保存
      const previousContentTags = queryClient.getQueryData(["content-tags", selectedContent, selectedCategory]);
      const previousUnlinkedTags = queryClient.getQueryData<any[]>(["unlinked-tags"]);

      // 紐づけるタグを取得
      const tagToLink = previousUnlinkedTags?.find(t => t.id === tagId);
      
      // 楽観的更新: 未紐づけタグから削除
      queryClient.setQueryData<any[]>(["unlinked-tags"], (old) => 
        old ? old.filter(t => t.id !== tagId) : old
      );
      
      // 楽観的更新: コンテンツタグに追加
      if (tagToLink) {
        queryClient.setQueryData<any[]>(["content-tags", selectedContent, selectedCategory], (old) => 
          old ? [...old, { ...tagToLink, category: selectedCategory }] : [{ ...tagToLink, category: selectedCategory }]
        );
      }

      return { previousContentTags, previousUnlinkedTags };
    },
    onError: (_err, _tagId, context) => {
      if (context?.previousContentTags) {
        queryClient.setQueryData(["content-tags", selectedContent, selectedCategory], context.previousContentTags);
      }
      if (context?.previousUnlinkedTags) {
        queryClient.setQueryData(["unlinked-tags"], context.previousUnlinkedTags);
      }
      toast.error(t("tagManage.toast.linkFailed"));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["content-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["unlinked-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-by-category"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-with-count"], refetchType: "active" }),
      ]);
      toast.success(t("tagManage.toast.tagLinked"));
    },
  });

  // タグを一括でコンテンツに紐づける
  const linkMultipleTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      const content = contentNames.find(c => c.name === selectedContent);
      if (!content) throw new Error("コンテンツが見つかりません");

      const { error } = await supabase
        .from("tags")
        .update({ 
          content_id: content.id,
          category: selectedCategory 
        })
        .in("id", tagIds);

      if (error) throw error;
      return tagIds;
    },
    onMutate: async (tagIds) => {
      await queryClient.cancelQueries({ queryKey: ["content-tags"] });
      await queryClient.cancelQueries({ queryKey: ["unlinked-tags"] });

      const previousContentTags = queryClient.getQueryData(["content-tags", selectedContent, selectedCategory]);
      const previousUnlinkedTags = queryClient.getQueryData<any[]>(["unlinked-tags"]);

      // 紐づけるタグを取得
      const tagsToLink = previousUnlinkedTags?.filter(t => tagIds.includes(t.id)) || [];
      
      // 楽観的更新: 未紐づけタグから削除
      queryClient.setQueryData<any[]>(["unlinked-tags"], (old) => 
        old ? old.filter(t => !tagIds.includes(t.id)) : old
      );
      
      // 楽観的更新: コンテンツタグに追加
      queryClient.setQueryData<any[]>(["content-tags", selectedContent, selectedCategory], (old) => {
        const updatedTags = tagsToLink.map(t => ({ ...t, category: selectedCategory }));
        return old ? [...old, ...updatedTags] : updatedTags;
      });

      return { previousContentTags, previousUnlinkedTags };
    },
    onError: (_err, _tagIds, context) => {
      if (context?.previousContentTags) {
        queryClient.setQueryData(["content-tags", selectedContent, selectedCategory], context.previousContentTags);
      }
      if (context?.previousUnlinkedTags) {
        queryClient.setQueryData(["unlinked-tags"], context.previousUnlinkedTags);
      }
      toast.error(t("tagManage.toast.linkFailed"));
    },
    onSuccess: async (tagIds) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["content-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["unlinked-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-by-category"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-with-count"], refetchType: "active" }),
      ]);
      
      setSelectedUnlinkedTags([]);
      toast.success(`${t("tagManage.toast.bulkLinkedPrefix")}${tagIds.length}${t("tagManage.toast.bulkLinkedSuffix")}`);
    },
  });

  // タグ更新
  const updateTagMutation = useMutation({
    mutationFn: async ({ tagId, newName }: { tagId: string; newName: string }) => {
      const { error } = await supabase
        .from("tags")
        .update({ name: newName })
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      // すべてのタグ関連のクエリを無効化
      queryClient.invalidateQueries({ queryKey: ["content-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      setEditingTagId(null);
      setEditingTagName("");
      toast.success(t("tagManage.toast.tagUpdated"));
    },
    onError: (error: any) => {
      toast.error(t("tagManage.toast.updateFailedPrefix") + error.message);
    },
  });

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      toast.error(t("tagManage.toast.nameRequired"));
      return;
    }

    if (!selectedContent) {
      toast.error(t("tagManage.toast.contentRequired"));
      return;
    }

    addTagMutation.mutate(newTagName.trim());
  };

  const handleStartEdit = (tagId: string, tagName: string) => {
    setEditingTagId(tagId);
    setEditingTagName(tagName);
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingTagName("");
  };

  const handleSaveEdit = (tagId: string) => {
    if (!editingTagName.trim()) {
      toast.error(t("tagManage.toast.nameRequired"));
      return;
    }

    updateTagMutation.mutate({ tagId, newName: editingTagName.trim() });
  };

  const handleToggleUnlinkedTag = (tagId: string) => {
    setSelectedUnlinkedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleLinkSelectedTags = () => {
    if (selectedUnlinkedTags.length === 0) {
      toast.error(t("tagManage.toast.selectTags"));
      return;
    }
    linkMultipleTagsMutation.mutate(selectedUnlinkedTags);
  };

  const handleDeleteSelectedTags = () => {
    if (selectedUnlinkedTags.length === 0) {
      toast.error(t("tagManage.toast.selectTagsToDelete"));
      return;
    }
    if (!confirm(`${t("tagManage.toast.confirmDeletePrefix")}${selectedUnlinkedTags.length}${t("tagManage.toast.confirmDeleteSuffix")}`)) {
      return;
    }
    deleteMultipleTagsMutation.mutate(selectedUnlinkedTags);
  };

  const categoryLabel = selectedCategory === "character" ? t("tagManage.category.characterFull") : t("tagManage.category.series");

  const [tagSearchQuery, setTagSearchQuery] = useState("");

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  const filteredUnlinkedTags = unlinkedTags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
          <DialogHeader className="text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Tags className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{t("tagManage.manage.title")}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {t("tagManage.manage.description")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* コンテンツ・カテゴリ選択 */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* コンテンツ選択 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    {t("tagManage.content.heading")}
                  </Label>
                  <Select value={selectedContent} onValueChange={setSelectedContent}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder={t("tagManage.common.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {contentNames.map((content) => (
                        <SelectItem key={content.id} value={content.name}>
                          {content.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* カテゴリ選択 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t("tagManage.manage.tagType")}
                  </Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={(value) => setSelectedCategory(value as "character" | "series")}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">{t("tagManage.category.characterFull")}</SelectItem>
                      <SelectItem value="series">{t("tagManage.category.series")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {!selectedContent && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {t("tagManage.manage.selectContentPrompt")}
              </p>
            </div>
          )}

          {selectedContent && (
            <>
              {/* 検索・新規追加 */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("tagManage.search.placeholder")}
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={`${t("tagManage.manage.newTagPrefix")}${categoryLabel}${t("tagManage.manage.newTagSuffix")}`}
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddTag();
                      }
                    }}
                    className="w-full sm:w-48"
                  />
                  <Button 
                    onClick={handleAddTag}
                    disabled={addTagMutation.isPending || !newTagName.trim()}
                    size="icon"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* タグ一覧 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <Badge variant="secondary" className="font-normal">
                      {selectedContent}
                    </Badge>
                    <span>{categoryLabel}</span>
                    <Badge variant="outline" className="ml-1">
                      {filteredTags.length}{t("tagManage.common.countSuffix")}
                    </Badge>
                  </Label>
                </div>
                
                <Card>
                  <ScrollArea className="h-[180px]">
                    {filteredTags.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                        <Tags className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {tagSearchQuery ? t("tagManage.empty.noSearchResults") : `${t("tagManage.empty.notRegisteredPrefix")}${categoryLabel}${t("tagManage.empty.notRegisteredSuffix")}`}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            {editingTagId === tag.id ? (
                              <>
                                <Input
                                  value={editingTagName}
                                  onChange={(e) => setEditingTagName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEdit(tag.id);
                                    } else if (e.key === "Escape") {
                                      handleCancelEdit();
                                    }
                                  }}
                                  className="flex-1 h-8"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleSaveEdit(tag.id)}
                                >
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm font-medium">{tag.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleStartEdit(tag.id, tag.name)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => deleteTagMutation.mutate(tag.id)}
                                    disabled={deleteTagMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </div>

              {/* 未紐づけタグ */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    {t("tagManage.manage.unlinkedTags")}
                    {unlinkedTags.length > 0 && (
                      <Badge variant="outline">
                        {selectedUnlinkedTags.length > 0 
                          ? `${selectedUnlinkedTags.length}/${unlinkedTags.length}${t("tagManage.manage.selectedSuffix")}`
                          : `${unlinkedTags.length}${t("tagManage.common.countSuffix")}`
                        }
                      </Badge>
                    )}
                  </Label>
                  {selectedUnlinkedTags.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDeleteSelectedTags}
                        disabled={deleteMultipleTagsMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        {t("tagManage.common.delete")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleLinkSelectedTags}
                        disabled={linkMultipleTagsMutation.isPending}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        {t("tagManage.manage.link")}
                      </Button>
                    </div>
                  )}
                </div>
                
                <Card className="bg-muted/30">
                  <ScrollArea className="h-[150px]">
                    {filteredUnlinkedTags.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                        <Check className="h-8 w-8 text-primary/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {tagSearchQuery ? t("tagManage.empty.noSearchResults") : t("tagManage.empty.noUnlinkedTags")}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {filteredUnlinkedTags.map((tag) => (
                          <div
                            key={tag.id}
                            className={`flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer group ${
                              selectedUnlinkedTags.includes(tag.id)
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50 border border-transparent"
                            }`}
                            onClick={() => handleToggleUnlinkedTag(tag.id)}
                          >
                            <Checkbox
                              checked={selectedUnlinkedTags.includes(tag.id)}
                              onCheckedChange={() => handleToggleUnlinkedTag(tag.id)}
                              className="pointer-events-none"
                            />
                            <span className="flex-1 text-sm truncate">{tag.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {tag.category || t("tagManage.manage.uncategorized")}
                            </Badge>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  linkTagMutation.mutate(tag.id);
                                }}
                                disabled={linkTagMutation.isPending}
                                className="h-6 w-6"
                                title={t("tagManage.manage.linkTitle")}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTagMutation.mutate(tag.id);
                                }}
                                disabled={deleteTagMutation.isPending}
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                title={t("tagManage.common.delete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            {t("tagManage.common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
