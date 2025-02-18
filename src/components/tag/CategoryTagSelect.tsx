
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

  const { data: tags = [] } = useQuery({
    queryKey: ["tags", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

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
        .insert([
          {
            name: newTagName.trim(),
            category: category,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "タグを追加しました",
        description: `${newTagName}を追加しました。`,
      });

      // クエリキャッシュを更新
      await queryClient.invalidateQueries({ queryKey: ["tags", category] });

      // 新しいタグを選択
      onChange(newTag.id);
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

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="選択してください" />
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
