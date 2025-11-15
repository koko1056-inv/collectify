import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      // すべてのタグ関連のクエリを無効化
      queryClient.invalidateQueries({ queryKey: ["content-tags"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      toast.success("タグを削除しました");
    },
    onError: (error: any) => {
      toast.error("タグの削除に失敗しました: " + error.message);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-tags"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      toast.success(`タグを「${selectedContent}」の${selectedCategory === 'character' ? 'キャラクター・人物名' : 'グッズシリーズ'}に紐づけました`);
    },
    onError: (error: any) => {
      toast.error("タグの紐づけに失敗しました: " + error.message);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-tags"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      setSelectedUnlinkedTags([]);
      toast.success(`${selectedUnlinkedTags.length}件のタグを「${selectedContent}」の${selectedCategory === 'character' ? 'キャラクター・人物名' : 'グッズシリーズ'}に紐づけました`);
    },
    onError: (error: any) => {
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

  const categoryLabel = selectedCategory === "character" ? "キャラクター・人物名" : "グッズシリーズ";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col" >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            タグ管理 - コンテンツ別
          </DialogTitle>
          <DialogDescription className="sr-only">タグ管理モーダル。コンテンツごとのタグ編集と未紐づけタグの紐づけを行います。</DialogDescription>
        </DialogHeader>

        <div className="flex-1 pr-4 overflow-y-auto">
          <div className="space-y-4">
            {/* コンテンツ選択 */}
            <div className="space-y-2">
              <Label>コンテンツを選択</Label>
              <Select value={selectedContent} onValueChange={setSelectedContent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="コンテンツを選択してください" />
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
              <Label>タグの種類</Label>
              <Select 
                value={selectedCategory} 
                onValueChange={(value) => setSelectedCategory(value as "character" | "series")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character">キャラクター・人物名</SelectItem>
                  <SelectItem value="series">グッズシリーズ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedContent && (
              <>
                {/* 新しいタグを追加 */}
                <div className="space-y-2">
                  <Label>新しい{categoryLabel}を追加</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={`${categoryLabel}名を入力`}
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddTag();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleAddTag}
                      disabled={addTagMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      追加
                    </Button>
                  </div>
                </div>

                 {/* タグ一覧 */}
                <div className="space-y-2">
                  <Label>
                    {selectedContent}の{categoryLabel}一覧 ({tags.length}件)
                  </Label>
                  <ScrollArea className="h-[150px] border rounded-md p-4">
                    {tags.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        まだ{categoryLabel}が登録されていません
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
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
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSaveEdit(tag.id)}
                                >
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1">{tag.name}</span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(tag.id, tag.name)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteTagMutation.mutate(tag.id)}
                                    disabled={deleteTagMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* コンテンツに紐づいていないタグ */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">
                      未紐づけタグ {unlinkedTags.length > 0 && `（${selectedUnlinkedTags.length}/${unlinkedTags.length}選択中）`}
                    </Label>
                    {selectedUnlinkedTags.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleLinkSelectedTags}
                        disabled={linkMultipleTagsMutation.isPending}
                      >
                        選択したタグを「{selectedContent}」に紐づけ
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[150px] border rounded-md p-2">
                    {unlinkedTags.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        このカテゴリーには未紐づけのタグはありません
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unlinkedTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded hover:bg-accent transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUnlinkedTags.includes(tag.id)}
                              onChange={() => handleToggleUnlinkedTag(tag.id)}
                              className="h-4 w-4 cursor-pointer"
                            />
                            <span className="flex-1 text-sm">{tag.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => linkTagMutation.mutate(tag.id)}
                              disabled={linkTagMutation.isPending}
                              className="h-6 w-6"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
