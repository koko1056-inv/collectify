import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
interface ContentNameSectionProps {
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  contentName: string | null | undefined;
}
export function ContentNameSection({
  isEditing,
  editedData,
  setEditedData,
  contentName
}: ContentNameSectionProps) {
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const {
    data: contentNames = []
  } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("content_names").select("*").order("name");
      if (error) throw error;
      return data;
    }
  });
  const addContentMutation = async (name: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from("content_names").insert([{
        name,
        type: "other"
      }]).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["content-names"]
      });
      setEditedData({
        ...editedData,
        content_name: data.name
      });
      setIsAddingNewContent(false);
      setNewContentName("");
      toast({
        title: "コンテンツを追加しました",
        description: `${data.name}を追加しました`
      });
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        title: "エラー",
        description: "コンテンツの追加に失敗しました",
        variant: "destructive"
      });
    }
  };
  const handleContentChange = (value: string) => {
    if (value === "other") {
      setIsAddingNewContent(true);
      setEditedData({
        ...editedData,
        content_name: null
      });
    } else if (value === "none") {
      setEditedData({
        ...editedData,
        content_name: null
      });
    } else {
      setEditedData({
        ...editedData,
        content_name: value
      });
    }
  };
  if (!isEditing && contentName) {
    return <div className="text-sm">
        <span className="font-medium">コンテンツ: </span>
        <span>{contentName}</span>
      </div>;
  }
  if (!isEditing) return null;
  return <div className="space-y-1">
      <label className="text-sm font-medium">
        コンテンツ
      </label>
      {isAddingNewContent ? <div className="flex gap-2">
          <Input value={newContentName} onChange={e => setNewContentName(e.target.value)} placeholder="新しいコンテンツ名" />
          <Button onClick={() => addContentMutation(newContentName)}>
            追加
          </Button>
          <Button variant="outline" onClick={() => {
        setIsAddingNewContent(false);
        setNewContentName("");
      }}>
            キャンセル
          </Button>
        </div> : <Select value={editedData.content_name || "none"} onValueChange={handleContentChange}>
          <SelectTrigger>
            <SelectValue placeholder="コンテンツを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">選択なし</SelectItem>
            {contentNames.map(content => <SelectItem key={content.id} value={content.name}>
                {content.name}
              </SelectItem>)}
            <SelectItem value="other">その他（新規追加）</SelectItem>
          </SelectContent>
        </Select>}
    </div>;
}