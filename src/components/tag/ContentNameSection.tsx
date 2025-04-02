
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface ContentNameSectionProps {
  contentName: string | null;
  onContentChange: (contentName: string | null) => void;
}

export function ContentNameSection({ contentName, onContentChange }: ContentNameSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");

  const { data: contentNames = [], isLoading: isContentLoading } = useQuery({
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
      
      onContentChange(data.name);
      
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

  return (
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
  );
}
