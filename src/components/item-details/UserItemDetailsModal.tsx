import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Tag, Heart, Share2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { differenceInCalendarDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { PersonalTagsSection } from "@/components/personal-tags/PersonalTagsSection";
import { TradeAvailabilitySection } from "./TradeAvailabilitySection";
import { PurchaseRecordSection } from "./PurchaseRecordSection";
import { UserItemPostsSection } from "@/components/item-posts/UserItemPostsSection";
import { ItemPostsSection } from "@/components/item-posts/ItemPostsSection";
import { useItemShare } from "@/hooks/useItemShare";
import { useLanguage } from "@/contexts/LanguageContext";
import { compressImageFile, ITEM_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";
import { DETAIL_IMAGE_WIDTH, fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";

interface UserItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  title: string;
  image: string;
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
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
      return data;
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

  // 公式の写真が使えないグッズに、自分の写真を入れる（自分のグッズだけ）
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;
    setIsUploadingPhoto(true);
    try {
      const compressed = await compressImageFile(file, ITEM_IMAGE_OPTIONS);
      const ext = compressed.name.split(".").pop() || "jpg";
      const filePath = `${itemId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("kuji_images")
        .upload(filePath, compressed, { cacheControl: UPLOAD_CACHE_CONTROL });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("kuji_images").getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from("user_items")
        .update({ image: urlData.publicUrl })
        .eq("id", itemId)
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-item-details", itemId], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["collection"], refetchType: "all" }),
      ]);
      toast.success(t("collectionScreen.cardImage.photoAdded"));
    } catch (error) {
      console.error("Failed to add photo:", error);
      toast.error(t("collectionScreen.cardImage.photoAddFailed"));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const currentImage = itemDetails?.image || image;
  const noPhoto = !currentImage || currentImage === "/placeholder.svg";
  const isOwner = !!user?.id && itemDetails?.user_id === user.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base sm:text-lg leading-snug break-words">
            {title}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          // 詳細を読んでいる間も、一覧から受け取った画像は先に出す（同じURLなので、読み終えた後はそのまま使われる）
          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            {image ? (
              <img
                src={getOptimizedImageUrl(image, { width: DETAIL_IMAGE_WIDTH })}
                onError={fallbackToOriginal(image)}
                alt={title}
                decoding="async"
                fetchPriority="high"
                className="w-full h-full object-contain"
              />
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* メイン画像 */}
            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {/* 元画像（ユーザーの写真は 1MB 超の PNG もある）ではなく、画面の幅に合わせて縮めたものを読む */}
              <img
                src={getOptimizedImageUrl(itemDetails?.image || image, { width: DETAIL_IMAGE_WIDTH })}
                onError={fallbackToOriginal(itemDetails?.image || image)}
                alt={title}
                decoding="async"
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
              {/* 写真がないグッズは、自分の写真を追加できる */}
              {noPhoto && isOwner && (
                <label className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-opacity hover:opacity-90 has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
                  {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {t("collectionScreen.cardImage.addPhoto")}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isUploadingPhoto}
                    onChange={handlePhotoSelect}
                  />
                </label>
              )}
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

              {/* 買ったときの記録（買った日・値段・お店）。値段は推し活費に入る */}
              {isOwner ? (
                <PurchaseRecordSection itemId={itemId} record={itemDetails} />
              ) : null}

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

              {/* 所持数と「交換に出す」。自分のグッズを開いたときだけ表示する */}
              {itemDetails && itemDetails.user_id === user?.id && (
                <TradeAvailabilitySection
                  itemId={itemId}
                  quantity={itemDetails.quantity ?? 1}
                  forTrade={itemDetails.for_trade ?? false}
                />
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

            {/* このグッズの投稿（自分がこのグッズについて書いたもの） */}
            <div className="pt-4 border-t border-border">
              <UserItemPostsSection
                userItemId={itemId}
                ownerId={itemDetails?.user_id}
                isOwner={isOwner}
                itemTitle={title}
                itemImage={itemDetails?.image || image}
              />
            </div>

            {/* みんなの投稿（同じ公式グッズについて、他の人が書いたものも含む） */}
            {itemDetails?.official_item_id && (
              <div className="pt-4 border-t border-border">
                <ItemPostsSection
                  target={{ type: "official", id: itemDetails.official_item_id }}
                  itemTitle={title}
                  itemImage={itemDetails?.image || image}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
