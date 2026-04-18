import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Tag, BookHeart, Plus, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { PersonalTagsSection } from "@/components/personal-tags/PersonalTagsSection";
import { ItemPostsSection } from "@/components/item-posts/ItemPostsSection";

interface UserItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  title: string;
  image: string;
}

interface Memory {
  id: string;
  image_url: string | null;
  comment: string | null;
  created_at: string;
}

export function UserItemDetailsModal({
  isOpen,
  onClose,
  itemId,
  title,
  image,
}: UserItemDetailsModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [purchaseDateValue, setPurchaseDateValue] = useState("");
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [memoryComment, setMemoryComment] = useState("");
  const [memoryImage, setMemoryImage] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // user_itemの詳細を取得
  const { data: itemDetails, isLoading } = useQuery({
    queryKey: ["user-item-details", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            id,
            tag_id,
            tags (
              id,
              name
            )
          )
        `)
        .eq("id", itemId)
        .single();

      if (error) throw error;
      setNoteValue(data.note || "");
      setPurchaseDateValue(data.purchase_date || "");
      return data;
    },
    enabled: isOpen && !!itemId,
  });

  // 思い出を取得
  const { data: memories = [] } = useQuery({
    queryKey: ["item-memories", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Memory[];
    },
    enabled: isOpen && !!itemId,
  });

  // メモと購入日を保存
  const handleSaveNote = useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_items")
        .update({ 
          note: noteValue,
          purchase_date: purchaseDateValue || null
        })
        .eq("id", itemId);

      if (error) throw error;
      
      toast.success("保存しました");
      setIsEditingNote(false);
      queryClient.invalidateQueries({ queryKey: ["user-item-details", itemId] });
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [noteValue, purchaseDateValue, itemId, queryClient]);

  // 思い出を追加
  const handleAddMemory = useCallback(async () => {
    if (!memoryComment.trim() && !memoryImage) {
      toast.error("コメントか画像を入力してください");
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl: string | null = null;

      // 画像をアップロード
      if (memoryImage) {
        const fileExt = memoryImage.name.split('.').pop();
        const fileName = `${user?.id}/${itemId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("item-memories")
          .upload(fileName, memoryImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("item-memories")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      // 思い出を保存
      const { error } = await supabase
        .from("item_memories")
        .insert({
          user_item_id: itemId,
          comment: memoryComment.trim() || null,
          image_url: imageUrl,
        });

      if (error) throw error;

      toast.success("思い出を追加しました");
      setMemoryComment("");
      setMemoryImage(null);
      setIsAddingMemory(false);
      queryClient.invalidateQueries({ queryKey: ["item-memories", itemId] });
    } catch (error) {
      console.error("Error adding memory:", error);
      toast.error("追加に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [memoryComment, memoryImage, itemId, user?.id, queryClient]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMemoryImage(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span className="truncate">{title}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* メイン画像 */}
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-muted">
              <img
                src={itemDetails?.image || image}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 詳細情報 */}
            <div className="space-y-3">
              {itemDetails?.content_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">コンテンツ:</span>
                  <span className="font-medium">{itemDetails.content_name}</span>
                </div>
              )}

              {/* 購入日 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">購入日:</span>
                  {isEditingNote ? (
                    <Input
                      type="date"
                      value={purchaseDateValue}
                      onChange={(e) => setPurchaseDateValue(e.target.value)}
                      className="h-7 w-auto"
                    />
                  ) : (
                    <span className="font-medium">
                      {itemDetails?.purchase_date || "未設定"}
                    </span>
                  )}
                </div>
              </div>

              {itemDetails?.quantity && itemDetails.quantity > 1 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">所持数:</span>
                  <Badge variant="secondary" className="ml-2">
                    ×{itemDetails.quantity}
                  </Badge>
                </div>
              )}

              {/* 一言メモ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">一言メモ:</span>
                  {!isEditingNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setIsEditingNote(true)}
                    >
                      編集
                    </Button>
                  )}
                </div>
                {isEditingNote ? (
                  <div className="space-y-2">
                    <Textarea
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder="このグッズについての一言メモ..."
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingNote(false);
                          setNoteValue(itemDetails?.note || "");
                          setPurchaseDateValue(itemDetails?.purchase_date || "");
                        }}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNote}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground bg-muted p-2 rounded min-h-[40px]">
                    {itemDetails?.note || "メモはありません"}
                  </p>
                )}
              </div>

              {/* タグ */}
              {itemDetails?.user_item_tags && itemDetails.user_item_tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">タグ:</span>
                  <div className="flex flex-wrap gap-1">
                    {itemDetails.user_item_tags.map((tagItem: any) => (
                      <Badge key={tagItem.id} variant="outline" className="text-xs">
                        {tagItem.tags?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* マイタグ */}
              <PersonalTagsSection userItemId={itemId} />
            </div>

            {/* 思い出記録セクション */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookHeart className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">思い出記録</span>
                </div>
                {!isAddingMemory && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setIsAddingMemory(true)}
                  >
                    <Plus className="w-3 h-3" />
                    追加
                  </Button>
                )}
              </div>

              {/* 思い出追加フォーム */}
              {isAddingMemory && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Textarea
                    value={memoryComment}
                    onChange={(e) => setMemoryComment(e.target.value)}
                    placeholder="思い出のコメント..."
                    className="min-h-[60px] bg-background"
                  />
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ImagePlus className="w-4 h-4" />
                        {memoryImage ? memoryImage.name : "画像を追加"}
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingMemory(false);
                        setMemoryComment("");
                        setMemoryImage(null);
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddMemory}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "記録"}
                    </Button>
                  </div>
                </div>
              )}

              {/* 思い出一覧 */}
              {memories.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {memories.map((memory) => (
                    <div key={memory.id} className="bg-muted/50 rounded-lg p-2 space-y-1">
                      {memory.image_url && (
                        <img
                          src={memory.image_url}
                          alt="思い出の画像"
                          className="w-full rounded aspect-video object-cover"
                        />
                      )}
                      {memory.comment && (
                        <p className="text-xs text-foreground">{memory.comment}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(memory.created_at), "yyyy年M月d日", { locale: ja })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  まだ思い出がありません
                </p>
              )}
            </div>

            {/* みんなの投稿セクション */}
            <div className="pt-4 border-t border-border">
              <ItemPostsSection
                target={{ type: "user_item", id: itemId }}
                itemTitle={title}
                itemImage={itemDetails?.image || image}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
