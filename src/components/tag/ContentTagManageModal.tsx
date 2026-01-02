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
      toast.success("タグを追加しました");
    },
    onError: (error: any) => {
      toast.error("タグの追加に失敗しました: " + error.message);
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
      toast.error("タグの削除に失敗しました");
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
      toast.success("タグを削除しました");
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
      toast.error("タグの一括削除に失敗しました");
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
      toast.success(`${tagCount}件のタグを削除しました`);
    },
  });

  // タグをコンテンツに紐づける
  const linkTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const content = contentNames.find(c => c.name === selectedContent);
      if (!content) throw new Error("コンテンツが見つかりません");

      console.log('[linkTag] Updating tag:', { tagId, contentId: content.id, category: selectedCategory });

      const { error } = await supabase
        .from("tags")
        .update({ 
          content_id: content.id,
          category: selectedCategory 
        })
        .eq("id", tagId);

      if (error) throw error;
      
      console.log('[linkTag] Successfully updated tag in database');
    },
    onSuccess: async () => {
      console.log('[linkTag] Invalidating queries for:', { selectedContent, selectedCategory });
      
      // 現在選択中のコンテンツのクエリを特定して無効化
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["content-tags", selectedContent, selectedCategory], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["content-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["unlinked-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-by-category"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-with-count"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["official-items"], refetchType: "active" }),
      ]);
      
      console.log('[linkTag] Queries invalidated, UI should update now');
      toast.success(`タグを「${selectedContent}」の${selectedCategory === 'character' ? 'キャラクター・人物名' : 'グッズシリーズ'}に紐づけました`);
    },
    onError: (error: any) => {
      console.error('[linkTag] Error:', error);
      toast.error("タグの紐づけに失敗しました: " + error.message);
    },
  });

  // タグを一括でコンテンツに紐づける
  const linkMultipleTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      const content = contentNames.find(c => c.name === selectedContent);
      if (!content) throw new Error("コンテンツが見つかりません");

      console.log('[linkMultipleTags] Updating tags:', { tagIds, contentId: content.id, category: selectedCategory });

      const { error } = await supabase
        .from("tags")
        .update({ 
          content_id: content.id,
          category: selectedCategory 
        })
        .in("id", tagIds);

      if (error) throw error;
      
      console.log('[linkMultipleTags] Successfully updated tags in database');
      return tagIds.length;
    },
    onSuccess: async (count) => {
      console.log('[linkMultipleTags] Invalidating queries for:', { selectedContent, selectedCategory, count });
      
      // 現在選択中のコンテンツのクエリを特定して無効化
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["content-tags", selectedContent, selectedCategory], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["content-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["unlinked-tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-by-category"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["tags-with-count"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["official-items"], refetchType: "active" }),
      ]);
      
      const tagCount = selectedUnlinkedTags.length;
      setSelectedUnlinkedTags([]);
      
      console.log('[linkMultipleTags] Queries invalidated, UI should update now');
      toast.success(`${tagCount}件のタグを「${selectedContent}」の${selectedCategory === 'character' ? 'キャラクター・人物名' : 'グッズシリーズ'}に紐づけました`);
    },
    onError: (error: any) => {
      console.error('[linkMultipleTags] Error:', error);
      toast.error("タグの紐づけに失敗しました: " + error.message);
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
      toast.success("タグを更新しました");
    },
    onError: (error: any) => {
      toast.error("タグの更新に失敗しました: " + error.message);
    },
  });

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      toast.error("タグ名を入力してください");
      return;
    }

    if (!selectedContent) {
      toast.error("コンテンツを選択してください");
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
      toast.error("タグ名を入力してください");
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
      toast.error("タグを選択してください");
      return;
    }
    linkMultipleTagsMutation.mutate(selectedUnlinkedTags);
  };

  const handleDeleteSelectedTags = () => {
    if (selectedUnlinkedTags.length === 0) {
      toast.error("削除するタグを選択してください");
      return;
    }
    if (!confirm(`選択した${selectedUnlinkedTags.length}件のタグを削除してもよろしいですか？`)) {
      return;
    }
    deleteMultipleTagsMutation.mutate(selectedUnlinkedTags);
  };

  const categoryLabel = selectedCategory === "character" ? "キャラクター・人物名" : "グッズシリーズ";

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
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Tags className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">タグ管理</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  コンテンツごとにタグを整理・管理できます
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
                    コンテンツ
                  </Label>
                  <Select value={selectedContent} onValueChange={setSelectedContent}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="選択してください" />
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
                    タグの種類
                  </Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={(value) => setSelectedCategory(value as "character" | "series")}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">キャラクター・人物名</SelectItem>
                      <SelectItem value="series">グッズシリーズ</SelectItem>
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
                コンテンツを選択してタグを管理してください
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
                    placeholder="タグを検索..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={`新しい${categoryLabel}を追加`}
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
                      {filteredTags.length}件
                    </Badge>
                  </Label>
                </div>
                
                <Card>
                  <ScrollArea className="h-[180px]">
                    {filteredTags.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                        <Tags className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {tagSearchQuery ? "検索結果がありません" : `${categoryLabel}がまだ登録されていません`}
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
                    未紐づけタグ
                    {unlinkedTags.length > 0 && (
                      <Badge variant="outline">
                        {selectedUnlinkedTags.length > 0 
                          ? `${selectedUnlinkedTags.length}/${unlinkedTags.length}選択中`
                          : `${unlinkedTags.length}件`
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
                        削除
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleLinkSelectedTags}
                        disabled={linkMultipleTagsMutation.isPending}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        紐づけ
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
                          {tagSearchQuery ? "検索結果がありません" : "未紐づけのタグはありません"}
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
                              {tag.category || "未分類"}
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
                                title="紐づける"
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
                                title="削除"
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
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
