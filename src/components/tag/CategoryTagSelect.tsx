
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tag } from "@/types/tag";

interface CategoryTagSelectProps {
  category: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CategoryTagSelect({
  category,
  label,
  value,
  onChange,
}: CategoryTagSelectProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["tags", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, category, created_at")
        .eq("category", category)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  const selectedTag = tags.find(tag => tag.name === value);

  const handleAddNewTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "エラー",
        description: "タグ名を入力してください。",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newTag, error } = await supabase
        .from("tags")
        .insert([{
          name: newTagName.trim(),
          category: category,  // カテゴリを明示的に設定
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "タグを追加しました",
        description: `${newTagName}を追加しました。`,
      });

      await queryClient.invalidateQueries({ queryKey: ["tags", category] });

      if (newTag) {
        onChange(newTag.name);
      }
      setNewTagName("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding new tag:", error);
      toast({
        title: "エラー",
        description: "タグの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleValueChange = (tagId: string) => {
    const selectedTag = tags.find(tag => tag.id === tagId);
    if (selectedTag) {
      onChange(selectedTag.name);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedTag?.id}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue>
              {selectedTag ? selectedTag.name : "選択してください"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-white">
            <ScrollArea className="max-h-[200px]">
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいタグを追加</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="タグ名を入力"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddNewTag}>
              追加する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
