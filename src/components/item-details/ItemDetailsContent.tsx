import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/TagInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags?: Array<{ tags: { id: string; name: string; } | null; }>;
  memories?: any[];
  isUserItem?: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
}

export function ItemDetailsContent({
  image,
  title,
  tags = [],
  memories = [],
  isUserItem = false,
  isEditing,
  editedData,
  setEditedData,
}: ItemDetailsContentProps) {
  const { toast } = useToast();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const queryClient = useQueryClient();

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

  const addContentMutation = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from("content_names")
        .insert([{ 
          name, 
          type: "anime" // Set a valid type to satisfy the check constraint
        }])
        .select()
        .single();
      
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["content-names"] });
      setEditedData({ ...editedData, content_name: data.name });
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

  const handleContentChange = (value: string) => {
    if (value === "other") {
      setIsAddingNewContent(true);
      setEditedData({ ...editedData, content_name: null });
    } else if (value === "none") {
      setEditedData({ ...editedData, content_name: null });
    } else {
      setEditedData({ ...editedData, content_name: value });
    }
  };

  const selectedTags = tags
    .filter((tag): tag is { tags: { id: string; name: string; } } => 
      tag.tags !== null
    )
    .map(tag => tag.tags.name);

  const handleTagsChange = (newTags: string[]) => {
    setEditedData({ ...editedData, tags: newTags });
  };

  return (
    <ScrollArea className="flex-1 px-6">
      <div className="space-y-4">
        <div className="aspect-square relative overflow-hidden rounded-lg">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-contain bg-gray-100"
          />
        </div>

        {!isUserItem && isEditing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                コンテンツ
              </label>
              {isAddingNewContent ? (
                <div className="flex gap-2">
                  <Input
                    value={newContentName}
                    onChange={(e) => setNewContentName(e.target.value)}
                    placeholder="新しいコンテンツ名"
                  />
                  <Button 
                    onClick={() => addContentMutation(newContentName)}
                  >
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
                <Select
                  value={editedData.content_name || "none"}
                  onValueChange={handleContentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="コンテンツを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">選択なし</SelectItem>
                    {contentNames.map((content) => (
                      <SelectItem key={content.id} value={content.name}>
                        {content.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">その他（新規追加）</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <TagInput
              selectedTags={editedData.tags || selectedTags}
              onTagsChange={handleTagsChange}
            />
          </div>
        )}

        {!isEditing && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags
              .filter((tag): tag is { tags: { id: string; name: string; } } => 
                tag.tags !== null
              )
              .map((tag) => (
                <Badge key={tag.tags.id} variant="secondary">
                  {tag.tags.name}
                </Badge>
              ))}
          </div>
        )}

        {isUserItem && memories.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">メモリー</h4>
            {memories.map((memory) => (
              <div key={memory.id} className="space-y-2">
                {memory.image_url && (
                  <img
                    src={memory.image_url}
                    alt="Memory"
                    className="w-full rounded-lg"
                  />
                )}
                {memory.comment && (
                  <p className="text-sm text-gray-600">{memory.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}