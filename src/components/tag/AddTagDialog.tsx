
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  onTagAdded: (tagName: string) => void;
  contentId?: string | null; // コンテンツIDを追加
}

export function AddTagDialog({ isOpen, onClose, category, onTagAdded, contentId }: AddTagDialogProps) {
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();

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
        onTagAdded(existingTag.name);
        setNewTagName("");
        onClose();
        toast({
          title: "既存のタグを選択しました",
          description: `${existingTag.name}を選択しました。`,
        });
        return;
      }

      // 新しいタグを追加
      const trimmedName = newTagName.trim();
      
      // UUIDでないことを確認
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedName);
      if (isUUID) {
        console.error(`Cannot add UUID as tag name: ${trimmedName}`);
        toast({
          title: "エラー",
          description: "無効なタグ名です。",
          variant: "destructive",
        });
        return;
      }
      
      // タグデータを準備
      const tagData: any = {
        name: trimmedName,
        category: category,
      };
      
      // キャラクターとシリーズの場合、content_idを設定
      if ((category === "character" || category === "series") && contentId) {
        tagData.content_id = contentId;
      }
      
      const { data: newTag, error } = await supabase
        .from("tags")
        .insert([tagData])
        .select()
        .single();

      if (error) {
        console.error("Error adding new tag:", error);
        throw error;
      }

      if (newTag) {
        console.log(`Successfully added new tag: ${JSON.stringify(newTag)}`);
        onTagAdded(newTag.name); // 常にタグ名を返す
        
        toast({
          title: "タグを追加しました",
          description: `${trimmedName}を追加しました。`,
        });
      }

      setNewTagName("");
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleAddNewTag}>
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
