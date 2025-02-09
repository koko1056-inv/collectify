
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
import { ItemImageEditor } from "./ItemImageEditor";
import { ItemPriceAndDateForm } from "./ItemPriceAndDateForm";
import { ItemDetailsForm } from "./ItemDetailsForm";

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
  createdBy?: string | null;
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
  createdBy,
}: ItemDetailsContentProps) {
  const { toast } = useToast();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const queryClient = useQueryClient();

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile", createdBy],
    queryFn: async () => {
      if (!createdBy) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", createdBy)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!createdBy && !isUserItem,
  });

  const handleImageUpdate = (newImageUrl: string) => {
    setEditedData({ ...editedData, image: newImageUrl });
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
        <ItemImageEditor
          image={isEditing ? editedData.image : image}
          title={title}
          isEditing={isEditing}
          onImageUpdate={handleImageUpdate}
        />

        {isUserItem && (
          <ItemDetailsForm
            isEditing={isEditing}
            editedData={editedData}
            setEditedData={setEditedData}
            isUserItem={true}
          />
        )}

        {!isUserItem && (
          <>
            <div className="space-y-2">
              {contentName && (
                <div className="text-sm">
                  <span className="font-medium">コンテンツ: </span>
                  <span>{contentName}</span>
                </div>
              )}
              {creatorProfile && (
                <div className="text-sm">
                  <span className="font-medium">グッズ登録者: </span>
                  <span>{creatorProfile.display_name || creatorProfile.username}</span>
                </div>
              )}
              {releaseDate && (
                <div className="text-sm">
                  <span className="font-medium">登録日: </span>
                  <span>{format(new Date(releaseDate), 'yyyy/MM/dd')}</span>
                </div>
              )}
            </div>

            <ItemDetailsForm
              isEditing={isEditing}
              editedData={editedData}
              setEditedData={setEditedData}
              isUserItem={false}
            />
          </>
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

        {isEditing && (
          <div className="space-y-2">
            <label className="text-sm font-medium">タグ</label>
            <TagInput
              selectedTags={editedData.tags || selectedTags}
              onTagsChange={handleTagsChange}
            />
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
