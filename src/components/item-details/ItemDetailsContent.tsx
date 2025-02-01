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
import { format } from "date-fns";
import { ImageUpload } from "@/components/ImageUpload";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags?: Array<{ tags: { id: string; name: string; } | null; }>;
  memories?: any[];
  isUserItem?: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  contentName?: string | null;
  releaseDate?: string;
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
  contentName,
  releaseDate,
}: ItemDetailsContentProps) {
  const { toast } = useToast();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const queryClient = useQueryClient();
  const [isImageEditModalOpen, setIsImageEditModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageChange = async (file: File | null) => {
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      setEditedData({ ...editedData, image: publicUrl });
      setIsImageEditModalOpen(false);
      
      toast({
        title: "画像を更新しました",
        description: "アイテムの画像が正常に更新されました。",
      });
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "エラーが発生しました",
        description: "画像の更新中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
  };

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
          type: "anime"
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
        <div className="aspect-square relative overflow-hidden rounded-lg group">
          <img
            src={isEditing ? editedData.image : image}
            alt={title}
            className="w-full h-full object-contain bg-gray-100"
          />
          {isEditing && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsImageEditModalOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isUserItem && (
          <div className="space-y-2">
            {!isEditing && contentName && (
              <div className="text-sm">
                <span className="font-medium">コンテンツ: </span>
                <span>{contentName}</span>
              </div>
            )}
            {!isEditing && releaseDate && (
              <div className="text-sm">
                <span className="font-medium">登録日: </span>
                <span>{format(new Date(releaseDate), 'yyyy/MM/dd')}</span>
              </div>
            )}
          </div>
        )}

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
          <div className="space-y-2">
            <div className="text-sm font-medium">タグ</div>
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

        <Dialog open={isImageEditModalOpen} onOpenChange={setIsImageEditModalOpen}>
          <DialogContent>
            <h3 className="text-lg font-semibold mb-4">画像を編集</h3>
            <ImageUpload
              onImageChange={handleImageChange}
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
            />
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
