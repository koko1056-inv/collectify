
import { CategoryTagSelect } from "./CategoryTagSelect";
import { CurrentTagsList } from "./CurrentTagsList";
import { PendingTagsList } from "./PendingTagsList";
import { TagUpdate } from "@/types/tag";
import { removeTagFromItem } from "@/utils/tag/item-tag-operations";
import { setItemContent, getAllContentNames } from "@/utils/tag/content-operations";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

interface TagManageModalContentProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
  itemIds: string[];
  isUserItem?: boolean;
  contentName?: string | null;
  onContentChange?: (contentName: string | null) => void;
  officialTags?: SimpleItemTag[];
}

export function TagManageModalContent({
  currentTags,
  pendingUpdates,
  onTagChange,
  itemIds,
  isUserItem = false,
  contentName,
  onContentChange,
  officialTags = []
}: TagManageModalContentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");

  const { data: contentNames = [], isLoading: isContentLoading } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      return await getAllContentNames();
    },
  });

  const handleRemoveTag = async (tagId: string) => {
    try {
      for (const itemId of itemIds) {
        await removeTagFromItem(tagId, itemId, isUserItem);
      }

      await queryClient.invalidateQueries({ queryKey: ["current-tags", itemIds] });
      
      toast({
        title: "タグを削除しました",
        description: "タグが正常に削除されました。",
      });
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: "タグの削除中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  const handleContentChange = (value: string) => {
    if (value === "other") {
      setIsAddingNewContent(true);
      if (onContentChange) onContentChange(null);
    } else if (value === "none") {
      if (onContentChange) onContentChange(null);
    } else {
      if (onContentChange) onContentChange(value);
    }
  };

  const handleAddNewContent = async () => {
    if (!newContentName.trim()) {
      toast({
        title: "エラー",
        description: "コンテンツ名を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("content_names")
        .insert([{ name: newContentName, type: "other" }])
        .select()
        .single();
      
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ["content-names"] });
      
      if (onContentChange) onContentChange(data.name);
      
      setIsAddingNewContent(false);
      setNewContentName("");
      
      toast({
        title: "コンテンツを追加しました",
        description: `${data.name}を追加しました`,
      });
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        title: "エラー",
        description: "コンテンツの追加に失敗しました",
        variant: "destructive",
      });
    }
  };

  const originalTagsByCategory = {
    character: officialTags.filter(tag => tag.tags?.category === 'character'),
    type: officialTags.filter(tag => tag.tags?.category === 'type'),
    series: officialTags.filter(tag => tag.tags?.category === 'series'),
  };

  return (
    <ScrollArea className="h-[60vh] pr-4">
      <div className="space-y-4 sm:space-y-6 py-4">
        <CurrentTagsList 
          currentTags={currentTags} 
          onRemoveTag={handleRemoveTag}
        />
        
        {isUserItem && officialTags.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">公式アイテムのタグ:</h3>
            <div className="space-y-1">
              {Object.entries(originalTagsByCategory).map(([category, tags]) => 
                tags.length > 0 && (
                  <div key={category} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {category === 'character' ? 'キャラ:' : 
                       category === 'type' ? 'タイプ:' : 
                       category === 'series' ? 'シリーズ:' : ''}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, idx) => (
                        tag.tags && (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag.tags.name}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">コンテンツ</h3>
          
          {isAddingNewContent ? (
            <div className="flex gap-2">
              <Input
                value={newContentName}
                onChange={(e) => setNewContentName(e.target.value)}
                placeholder="新しいコンテンツ名"
                className="flex-1"
              />
              <Button onClick={handleAddNewContent}>
                追加
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingNewContent(false);
                  setNewContentName("");
                }}
              >
                キャンセル
              </Button>
            </div>
          ) : (
            isContentLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>読み込み中...</span>
              </div>
            ) : (
              <Select
                value={contentName || "none"}
                onValueChange={handleContentChange}
              >
                <SelectTrigger className="w-full bg-white text-black">
                  <SelectValue placeholder="コンテンツを選択" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none" className="text-black">選択なし</SelectItem>
                  {contentNames.map((content) => (
                    <SelectItem key={content.id} value={content.name} className="text-black">
                      {content.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other" className="text-black">その他（新規追加）</SelectItem>
                </SelectContent>
              </Select>
            )
          )}
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <CategoryTagSelect
            category="character"
            label="キャラ・人物名"
            value={
              pendingUpdates.find(u => u.category === 'character')?.value ||
              currentTags.find(tag => tag.tags?.category === 'character')?.tags?.name ||
              null
            }
            onChange={onTagChange("character")}
          />
          <CategoryTagSelect
            category="type"
            label="グッズタイプ"
            value={
              pendingUpdates.find(u => u.category === 'type')?.value ||
              currentTags.find(tag => tag.tags?.category === 'type')?.tags?.name ||
              null
            }
            onChange={onTagChange("type")}
          />
          <CategoryTagSelect
            category="series"
            label="グッズシリーズ"
            value={
              pendingUpdates.find(u => u.category === 'series')?.value ||
              currentTags.find(tag => tag.tags?.category === 'series')?.tags?.name ||
              null
            }
            onChange={onTagChange("series")}
          />

          <PendingTagsList pendingUpdates={pendingUpdates} />
        </div>
      </div>
    </ScrollArea>
  );
}
