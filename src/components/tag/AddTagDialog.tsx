
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { useUserPoints } from "@/hooks/usePoints";
import { useSpendPoints } from "@/hooks/useSpendPoints";

interface AddTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  onTagAdded: (tagName: string) => void;
  contentId?: string | null;
}

const TAG_CREATE_COST = 10;

export function AddTagDialog({ isOpen, onClose, category, onTagAdded, contentId }: AddTagDialogProps) {
  const [newTagName, setNewTagName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { data: userPoints } = useUserPoints();
  const spendPoints = useSpendPoints();
  const balance = userPoints?.total_points ?? 0;

  const handleAddNewTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "エラー",
        description: "タグ名を入力してください。",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // 既存タグチェック (既存タグなら課金しない)
      const { data: existingTag, error: checkError } = await supabase
        .from("tags")
        .select("*")
        .eq("name", newTagName.trim())
        .eq("category", category)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingTag) {
        onTagAdded(existingTag.name);
        setNewTagName("");
        onClose();
        toast({
          title: "既存のタグを選択しました",
          description: `${existingTag.name}を選択しました。`,
        });
        return;
      }

      const trimmedName = newTagName.trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedName);
      if (isUUID) {
        toast({ title: "エラー", description: "無効なタグ名です。", variant: "destructive" });
        return;
      }

      // 残高チェック
      if (balance < TAG_CREATE_COST) {
        toast({
          title: "ポイント不足",
          description: `カスタムタグの新規発行には ${TAG_CREATE_COST}pt 必要です（現在: ${balance}pt）`,
          variant: "destructive",
        });
        return;
      }

      // ポイント消費
      await spendPoints.mutateAsync({
        cost: TAG_CREATE_COST,
        transactionType: "custom_tag_create",
        description: `カスタムタグ発行: ${trimmedName}`,
      });

      const tagData: any = {
        name: trimmedName,
        category: category,
      };
      if ((category === "character" || category === "series") && contentId) {
        tagData.content_id = contentId;
      }

      const { data: newTag, error } = await supabase
        .from("tags")
        .insert([tagData])
        .select()
        .single();

      if (error) throw error;

      if (newTag) {
        onTagAdded(newTag.name);
        toast({
          title: "タグを追加しました",
          description: `${trimmedName} を追加しました (-${TAG_CREATE_COST}pt)`,
        });
      }

      setNewTagName("");
      onClose();
    } catch (error: any) {
      console.error("Error adding new tag:", error);
      toast({
        title: "エラー",
        description: error?.message || "タグの追加に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しいタグを追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
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
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
            <span className="text-muted-foreground">新規タグ発行コスト</span>
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              {TAG_CREATE_COST} pt（残高 {balance}pt）
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ※ 既存のタグ名と一致した場合はポイントを消費せず、そのタグを選択します。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button onClick={handleAddNewTag} disabled={submitting || balance < TAG_CREATE_COST}>
            {submitting ? "処理中…" : `${TAG_CREATE_COST}pt消費して追加`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
