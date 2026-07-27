import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Tag, BookHeart, Plus, ImagePlus, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { differenceInCalendarDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { PersonalTagsSection } from "@/components/personal-tags/PersonalTagsSection";
import { ItemPostsSection } from "@/components/item-posts/ItemPostsSection";
import { useItemShare } from "@/hooks/useItemShare";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";

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
  const { shareItem, isSharing } = useItemShare();
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingPurchaseDate, setIsEditingPurchaseDate] = useState(false);
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

  // メモを保存
  const handleSaveNote = useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_items")
        .update({ note: noteValue })
        .eq("id", itemId);

      if (error) throw error;
      
      toast.success(t("itemDetails.userItem.saved"));
      setIsEditingNote(false);
      queryClient.invalidateQueries({ queryKey: ["user-item-details", itemId] });
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error(t("itemDetails.userItem.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [noteValue, itemId, queryClient, t]);

  // 購入日を保存
  const handleSavePurchaseDate = useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_items")
        .update({ purchase_date: purchaseDateValue || null })
        .eq("id", itemId);

      if (error) throw error;

      toast.success(t("itemDetails.userItem.purchaseDateSaved"));
      setIsEditingPurchaseDate(false);
      queryClient.invalidateQueries({ queryKey: ["user-item-details", itemId] });
    } catch (error) {
      console.error("Error saving purchase date:", error);
      toast.error(t("itemDetails.userItem.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [purchaseDateValue, itemId, queryClient, t]);

  // 思い出を追加
  const handleAddMemory = useCallback(async () => {
    if (!memoryComment.trim() && !memoryImage) {
      toast.error(t("itemDetails.memories.needInput"));
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

      toast.success(t("itemDetails.memories.added"));
      setMemoryComment("");
      setMemoryImage(null);
      setIsAddingMemory(false);
      queryClient.invalidateQueries({ queryKey: ["item-memories", itemId] });
    } catch (error) {
      console.error("Error adding memory:", error);
      toast.error(t("itemDetails.memories.addFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [memoryComment, memoryImage, itemId, user?.id, queryClient, t]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMemoryImage(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base sm:text-lg leading-snug break-words">
            {title}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* メイン画像 */}
            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={itemDetails?.image || image}
                alt={title}
                className="w-full h-full object-contain"
              />
              {/* シェアボタン */}
              <button
                onClick={() =>
                  shareItem({
                    title,
                    imageUrl: itemDetails?.image || image,
                    contentName: itemDetails?.content_name ?? null,
                  })
                }
                disabled={isSharing}
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-60"
                aria-label={t("itemDetails.userItem.shareAria")}
                title={t("itemDetails.userItem.shareTitle")}
              >
                {isSharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* 詳細情報 */}
            <div className="space-y-3">
              {itemDetails?.content_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("itemDetails.userItem.contentLabel")}</span>
                  <span className="font-medium">{itemDetails.content_name}</span>
                </div>
              )}

              {/* 購入日 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{t("itemDetails.userItem.purchaseDateLabel")}</span>
                  {isEditingPurchaseDate ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Input
                        type="date"
                        value={purchaseDateValue}
                        onChange={(e) => setPurchaseDateValue(e.target.value)}
                        className="h-8 flex-1 min-w-0"
                      />
                      <Button
                        size="sm"
                        className="h-8 px-2"
                        onClick={handleSavePurchaseDate}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : t("itemDetails.common.save")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setIsEditingPurchaseDate(false);
                          setPurchaseDateValue(itemDetails?.purchase_date || "");
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">
                        {itemDetails?.purchase_date
                          ? formatDate(itemDetails.purchase_date)
                          : t("itemDetails.common.notSet")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs ml-auto"
                        onClick={() => setIsEditingPurchaseDate(true)}
                      >
                        {t("itemDetails.common.edit")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* お迎え日数（購入日 or 追加日からの経過） */}
              {(() => {
                const base = itemDetails?.purchase_date || itemDetails?.created_at;
                if (!base) return null;
                const days = Math.max(
                  1,
                  differenceInCalendarDays(new Date(), new Date(base)) + 1
                );
                return (
                  <div className="flex items-center gap-1.5 text-sm bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1.5 w-fit">
                    <Heart className="w-3.5 h-3.5 text-primary fill-primary/30" />
                    <span className="text-muted-foreground">{t("itemDetails.userItem.togetherPrefix")}</span>
                    <span className="font-bold text-primary tabular-nums">
                      {days.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">{t("itemDetails.userItem.togetherSuffix")}</span>
                  </div>
                );
              })()}

              {itemDetails?.quantity && itemDetails.quantity > 1 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t("itemDetails.userItem.quantityLabel")}</span>
                  <Badge variant="secondary" className="ml-2">
                    ×{itemDetails.quantity}
                  </Badge>
                </div>
              )}

              {/* 一言メモ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("itemDetails.userItem.noteLabel")}</span>
                  {!isEditingNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setIsEditingNote(true)}
                    >
                      {t("itemDetails.common.edit")}
                    </Button>
                  )}
                </div>
                {isEditingNote ? (
                  <div className="space-y-2">
                    <Textarea
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder={t("itemDetails.userItem.notePlaceholder")}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingNote(false);
                          setNoteValue(itemDetails?.note || "");
                        }}
                      >
                        {t("itemDetails.common.cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNote}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("itemDetails.common.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground bg-muted p-2 rounded min-h-[40px]">
                    {itemDetails?.note || t("itemDetails.userItem.noteEmpty")}
                  </p>
                )}
              </div>

              {/* タグ */}
              {itemDetails?.user_item_tags && itemDetails.user_item_tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t("itemDetails.userItem.tagsLabel")}</span>
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
                  <span className="font-medium text-sm">{t("itemDetails.memories.sectionTitle")}</span>
                </div>
                {!isAddingMemory && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setIsAddingMemory(true)}
                  >
                    <Plus className="w-3 h-3" />
                    {t("itemDetails.common.add")}
                  </Button>
                )}
              </div>

              {/* 思い出追加フォーム */}
              {isAddingMemory && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Textarea
                    value={memoryComment}
                    onChange={(e) => setMemoryComment(e.target.value)}
                    placeholder={t("itemDetails.memories.commentPlaceholder")}
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
                        {memoryImage ? memoryImage.name : t("itemDetails.memories.addImage")}
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
                      {t("itemDetails.common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddMemory}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("itemDetails.memories.record")}
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
                          alt={t("itemDetails.memories.imageAlt")}
                          className="w-full rounded aspect-video object-cover"
                        />
                      )}
                      {memory.comment && (
                        <p className="text-xs text-foreground">{memory.comment}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(memory.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {t("itemDetails.memories.empty")}
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
