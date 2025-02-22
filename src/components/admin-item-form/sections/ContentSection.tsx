
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContentSectionProps {
  contentName: string | null | undefined;
  onContentChange: (contentName: string | null) => void;
}

export function ContentSection({
  contentName,
  onContentChange,
}: ContentSectionProps) {
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
      onContentChange(data.name);
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
      onContentChange(null);
    } else if (value === "none") {
      onContentChange(null);
    } else {
      onContentChange(value);
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
    <div className="space-y-2">
      <label className="text-sm font-medium">コンテンツ</label>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
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
            value={contentName || "none"}
            onValueChange={handleContentChange}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="コンテンツを選択" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="none" className="hover:bg-gray-100">選択なし</SelectItem>
              {contentNames.map((content) => (
                <SelectItem 
                  key={content.id} 
                  value={content.name}
                  className="hover:bg-gray-100"
                >
                  {content.name}
                </SelectItem>
              ))}
              <SelectItem value="other" className="hover:bg-gray-100">その他（新規追加）</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
