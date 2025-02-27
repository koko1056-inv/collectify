
import React, { useState, useEffect } from 'react';
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
import type { Tag } from "@/types/tag";

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

  const { data: tags = [], refetch } = useQuery<Tag[]>({
    queryKey: ["tags", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // 値が変更されたら、親コンポーネントに通知
  useEffect(() => {
    const selectedTag = tags.find(tag => tag.name === value);
    if (selectedTag) {
      console.log(`CategoryTagSelect: Selected tag "${selectedTag.name}" for category "${category}"`);
    }
  }, [value, tags, category]);

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
      // 既存のタグをチェック
      const { data: existingTag } = await supabase
        .from("tags")
        .select("*")
        .eq("name", newTagName.trim())
        .eq("category", category)
        .single();

      if (existingTag) {
        onChange(existingTag.name);
        setNewTagName("");
        setIsDialogOpen(false);
        return;
      }

      // 新しいタグを追加
      const { data: newTag, error } = await supabase
        .from("tags")
        .insert([{
          name: newTagName.trim(),
          category: category,
        }])
        .select()
        .single();

      if (error) throw error;

      if (newTag) {
        onChange(newTag.name);
        // キャッシュを即座に更新
        await queryClient.invalidateQueries({ queryKey: ["tags", category] });
        await refetch(); // 即座にデータを再取得
        
        toast({
          title: "タグを追加しました",
          description: `${newTagName}を追加しました。`,
        });
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
      console.log(`CategoryTagSelect: Changed to "${selectedTag.name}" for category "${category}"`);
      onChange(selectedTag.name);
    }
  };

  // カテゴリー別のプレースホルダーテキスト
  const getPlaceholderText = () => {
    switch (category) {
      case 'character':
        return 'キャラクターを選択';
      case 'type':
        return 'グッズタイプを選択';
      case 'series':
        return 'グッズシリーズを選択';
      default:
        return '選択してください';
    }
  };

  // 現在選択されているタグを見つける
  const selectedTag = tags.find(tag => tag.name === value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedTag?.id}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={getPlaceholderText()} />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <ScrollArea className="max-h-[200px]">
              {tags.map((tag) => (
                <SelectItem 
                  key={tag.id} 
                  value={tag.id}
                  className="cursor-pointer hover:bg-gray-100"
                >
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddNewTag();
                }
              }}
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
