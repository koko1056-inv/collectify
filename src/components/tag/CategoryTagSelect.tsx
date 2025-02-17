
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TagData {
  id: string;
  name: string;
  category: string;
}

interface CategoryTagSelectProps {
  category: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CategoryTagSelect({ category, label, value, onChange }: CategoryTagSelectProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery({
    queryKey: ["tags", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .order("name");
      if (error) throw error;
      return data as TagData[];
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("tags")
        .insert([{ name, category }])
        .select()
        .single();
      
      if (error) throw error;
      return data as TagData;
    },
    onSuccess: (data) => {
      const queryKey = ["tags", category];
      const previousTags = queryClient.getQueryData<TagData[]>(queryKey) || [];
      queryClient.setQueryData<TagData[]>(queryKey, [...previousTags, data]);
      
      onChange(data.name);
      setIsAddingNew(false);
      setNewTagName("");
      toast({
        title: "タグを追加しました",
        description: `${data.name}を追加しました。`,
      });
    },
    onError: (error) => {
      console.error("Error adding tag:", error);
      toast({
        title: "エラー",
        description: "タグの追加に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleAddNewTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "エラー",
        description: "タグ名を入力してください。",
        variant: "destructive",
      });
      return;
    }
    addTagMutation.mutate(newTagName.trim());
  };

  const handleValueChange = (newValue: string) => {
    if (newValue === "add_new") {
      setIsAddingNew(true);
    } else if (newValue === "none") {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
      </label>
      {isAddingNew ? (
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder={`新しい${label}`}
            className="flex-1"
          />
          <Button 
            onClick={handleAddNewTag}
            disabled={addTagMutation.isPending}
          >
            追加
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsAddingNew(false);
              setNewTagName("");
            }}
          >
            キャンセル
          </Button>
        </div>
      ) : (
        <Select
          value={value || "none"}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={`${label}を選択`} />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="none" className="hover:bg-gray-100">選択なし</SelectItem>
            {tags.map((tag) => (
              <SelectItem 
                key={tag.id} 
                value={tag.name}
                className="hover:bg-gray-100"
              >
                {tag.name}
              </SelectItem>
            ))}
            <SelectItem value="add_new" className="hover:bg-gray-100 text-blue-600">
              + 新しい{label}を追加
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
