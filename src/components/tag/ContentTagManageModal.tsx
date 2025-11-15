import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
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
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["content-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
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
      queryClient.invalidateQueries({ queryKey: ["content-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("タグを削除しました");
    },
    onError: (error: any) => {
      toast.error("タグの削除に失敗しました: " + error.message);
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

  const categoryLabel = selectedCategory === "character" ? "キャラクター・人物名" : "グッズシリーズ";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            タグ管理 - コンテンツ別
          </DialogTitle>
        </DialogHeader>

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
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  {tags.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      まだ{categoryLabel}が登録されていません
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-accent"
                        >
                          <span>{tag.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTagMutation.mutate(tag.id)}
                            disabled={deleteTagMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
