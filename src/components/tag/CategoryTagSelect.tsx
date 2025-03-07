
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allTags = [], refetch } = useQuery<Tag[]>({
    queryKey: ["tags", category],
    queryFn: async () => {
      console.log(`Fetching tags for category: ${category}`);
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .order("name");

      if (error) {
        console.error(`Error fetching tags for category ${category}:`, error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} tags for category ${category}:`, data);
      return data || [];
    },
    staleTime: 0, // 常に最新データを取得
    refetchOnWindowFocus: true, // ウィンドウフォーカス時に再取得
    refetchOnMount: true, // コンポーネントマウント時に再取得
  });

  // 検索クエリでフィルタリングされたタグリスト
  const filteredTags = searchQuery.trim() === '' 
    ? allTags 
    : allTags.filter(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
  // 値が変更されたら、親コンポーネントに通知
  useEffect(() => {
    const selectedTag = allTags.find(tag => tag.name === value);
    if (selectedTag) {
      console.log(`CategoryTagSelect: Selected tag "${selectedTag.name}" for category "${category}"`);
    }
  }, [value, allTags, category]);

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
      console.log(`Attempting to add new tag: "${newTagName}" with category: "${category}"`);
      
      // 既存のタグをチェック
      const { data: existingTag, error: checkError } = await supabase
        .from("tags")
        .select("*")
        .eq("name", newTagName.trim())
        .eq("category", category)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking existing tag:", checkError);
        throw checkError;
      }

      if (existingTag) {
        console.log(`Tag already exists: ${JSON.stringify(existingTag)}`);
        onChange(existingTag.name);
        setNewTagName("");
        setIsDialogOpen(false);
        toast({
          title: "既存のタグを選択しました",
          description: `${existingTag.name}を選択しました。`,
        });
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

      if (error) {
        console.error("Error adding new tag:", error);
        throw error;
      }

      if (newTag) {
        console.log(`Successfully added new tag: ${JSON.stringify(newTag)}`);
        onChange(newTag.name);
        
        // キャッシュを完全に無効化して強制的に再取得
        await queryClient.invalidateQueries({ queryKey: ["tags", category] });
        await queryClient.resetQueries({ queryKey: ["tags", category] });
        
        // 強制的にデータを再取得
        const result = await refetch();
        console.log(`Refetched tags for category ${category} after adding new tag:`, result.data);
        
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
    const selectedTag = allTags.find(tag => tag.id === tagId);
    if (selectedTag) {
      console.log(`CategoryTagSelect: Changed to "${selectedTag.name}" for category "${category}"`);
      onChange(selectedTag.name);
    } else {
      console.warn(`Tag with ID ${tagId} not found in tags list for category ${category}`);
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
  const selectedTag = allTags.find(tag => tag.name === value);
  
  // デバッグ情報
  useEffect(() => {
    if (allTags.length > 0) {
      console.log(`[${category}] Available tags (${allTags.length}):`, allTags.map(t => t.name).join(', '));
    }
    if (value) {
      console.log(`[${category}] Current value:`, value);
      console.log(`[${category}] Selected tag:`, selectedTag);
    }
  }, [allTags, value, selectedTag, category]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedTag?.id}
          onValueChange={handleValueChange}
          onOpenChange={(open) => {
            if (open) {
              // セレクトが開かれたときに最新データを取得
              refetch();
              // 検索クエリをリセット
              setSearchQuery("");
            }
          }}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={getPlaceholderText()} />
          </SelectTrigger>
          <SelectContent className="bg-white w-full max-h-60 overflow-hidden" side="bottom">
            <div className="px-2 py-2 bg-white">
              <div className="flex items-center border rounded-md px-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  className="w-full p-2 bg-transparent focus:outline-none text-sm"
                  placeholder="タグを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="max-h-[200px] overflow-y-auto">
              {filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <SelectItem 
                    key={tag.id} 
                    value={tag.id}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    {tag.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500 text-center">
                  {searchQuery.trim() !== '' ? '該当するタグはありません' : 'タグがありません'}
                </div>
              )}
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

