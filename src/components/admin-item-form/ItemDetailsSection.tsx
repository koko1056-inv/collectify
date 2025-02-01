import { Input } from "@/components/ui/input";
import { TagInput } from "../TagInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface ItemDetailsSectionProps {
  formData: {
    title: string;
    description: string;
    content_name?: string | null;
  };
  setFormData: (data: any) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export function ItemDetailsSection({
  formData,
  setFormData,
  selectedTags,
  setSelectedTags,
}: ItemDetailsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");

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

  const addContentMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("content_names")
        .insert([{ name, type: "other" }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-names"] });
      setFormData({ ...formData, content_name: data.name });
      setIsAddingNewContent(false);
      setNewContentName("");
      toast({
        title: "コンテンツを追加しました",
        description: `${data.name}を追加しました`,
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "コンテンツの追加に失敗しました",
        variant: "destructive",
      });
      console.error("Error adding content:", error);
    },
  });

  const handleContentChange = (value: string) => {
    if (value === "other") {
      setIsAddingNewContent(true);
      setFormData({ ...formData, content_name: null });
    } else if (value === "none") {
      setFormData({ ...formData, content_name: null });
    } else {
      setFormData({ ...formData, content_name: value });
    }
  };

  const handleAddNewContent = () => {
    if (!newContentName.trim()) {
      toast({
        title: "エラー",
        description: "コンテンツ名を入力してください",
        variant: "destructive",
      });
      return;
    }
    addContentMutation.mutate(newContentName);
  };

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          タイトル
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          説明
        </label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

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
              onClick={handleAddNewContent}
              disabled={addContentMutation.isPending}
            >
              {addContentMutation.isPending ? "追加中..." : "追加"}
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
            value={formData.content_name || "none"}
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
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />
    </>
  );
}