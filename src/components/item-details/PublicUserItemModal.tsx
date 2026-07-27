import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Tag, Plus, Heart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { addToCollection } from "@/utils/collection-actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";

interface PublicUserItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** クリックされた user_items.id */
  itemId: string;
  title: string;
  image: string;
  /** 所有者(他人) のユーザーID — 表示用 */
  ownerId?: string;
}

/**
 * 他人のコレクションのグッズをタップした時に表示する詳細モーダル。
 * - 公式グッズ情報・タグを表示
 * - 自分のコレクションへ追加 / ウィッシュリストへ追加 ができる
 */
export function PublicUserItemModal({
  isOpen,
  onClose,
  itemId,
  title,
  image,
  ownerId,
}: PublicUserItemModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [wishing, setWishing] = useState(false);
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();

  // 該当ユーザーアイテムを取得 (official_item_id を引き当てる)
  const { data: itemDetails, isLoading } = useQuery({
    queryKey: ["public-user-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(
          `*, user_item_tags (id, tag_id, tags (id, name))`
        )
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: isOpen && !!itemId,
  });

  const officialItemId: string | null = itemDetails?.official_item_id || null;

  // 自分が既に所有しているか
  const { data: alreadyOwned } = useQuery({
    queryKey: ["already-owned", officialItemId, user?.id],
    queryFn: async () => {
      if (!user?.id || !officialItemId) return false;
      const { count } = await supabase
        .from("user_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("official_item_id", officialItemId);
      return (count || 0) > 0;
    },
    enabled: isOpen && !!user?.id && !!officialItemId,
  });

  // 自分のウィッシュリストに入っているか
  const { data: alreadyWished } = useQuery({
    queryKey: ["already-wished", officialItemId, user?.id],
    queryFn: async () => {
      if (!user?.id || !officialItemId) return false;
      const { count } = await supabase
        .from("wishlists")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("official_item_id", officialItemId);
      return (count || 0) > 0;
    },
    enabled: isOpen && !!user?.id && !!officialItemId,
  });

  // 公式アイテム情報
  const { data: officialItem } = useQuery({
    queryKey: ["official-item", officialItemId],
    queryFn: async () => {
      if (!officialItemId) return null;
      const { data, error } = await supabase
        .from("official_items")
        .select("*")
        .eq("id", officialItemId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!officialItemId,
  });

  const handleAddToCollection = async () => {
    if (!user) {
      toast.error(t("itemDetails.publicItem.loginRequired"));
      return;
    }
    if (!officialItemId) {
      toast.error(t("itemDetails.publicItem.noOfficialItem"));
      return;
    }
    setAdding(true);
    try {
      const result = await addToCollection({
        userId: user.id,
        title: officialItem?.title || title,
        image: officialItem?.image || image,
        officialItemId,
        releaseDate: officialItem?.release_date || new Date().toISOString().slice(0, 10),
        prize: officialItem?.price || "0",
      });
      if (!result.success) {
        if (result.isAtLimit) {
          toast.error(t("itemDetails.publicItem.limitError"));
          navigate("/point-shop");
        } else {
          toast.error(result.error || t("itemDetails.publicItem.addFailed"));
        }
        return;
      }
      // タグもコピー
      if (result.userItemId) {
        const { data: tags } = await supabase
          .from("item_tags")
          .select("tag_id")
          .eq("official_item_id", officialItemId);
        if (tags?.length) {
          await Promise.all(
            tags.map((t: any) =>
              supabase.from("user_item_tags").insert({
                user_item_id: result.userItemId,
                tag_id: t.tag_id,
              })
            )
          );
        }
      }
      await qc.invalidateQueries({ queryKey: ["user-items"] });
      await qc.invalidateQueries({ queryKey: ["already-owned", officialItemId, user.id] });
      await qc.invalidateQueries({ queryKey: ["collectionCount"] });
      toast.success(t("itemDetails.publicItem.addedToCollection"));
    } catch (e) {
      console.error(e);
      toast.error(t("itemDetails.publicItem.addFailed"));
    } finally {
      setAdding(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error(t("itemDetails.publicItem.loginRequired"));
      return;
    }
    if (!officialItemId) {
      toast.error(t("itemDetails.publicItem.noOfficialItem"));
      return;
    }
    setWishing(true);
    try {
      const { error } = await supabase.from("wishlists").insert({
        user_id: user.id,
        official_item_id: officialItemId,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["wishlist", user.id] });
      await qc.invalidateQueries({ queryKey: ["already-wished", officialItemId, user.id] });
      toast.success(t("itemDetails.publicItem.wishlistAdded"));
    } catch (e: any) {
      if (e?.code === "23505") {
        toast.info(t("itemDetails.publicItem.alreadyWishedToast"));
      } else {
        console.error(e);
        toast.error(t("itemDetails.publicItem.addFailed"));
      }
    } finally {
      setWishing(false);
    }
  };

  const tags: { id: string; name: string }[] =
    itemDetails?.user_item_tags?.map((t: any) => t.tags).filter(Boolean) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold pr-8">{title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
              <img src={image} alt={title} className="w-full h-full object-cover" />
            </div>

            {officialItem?.release_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {formatDate(officialItem.release_date)}
                {officialItem.price && officialItem.price !== "0" && (
                  <span className="ml-auto font-semibold text-foreground">
                    ¥{officialItem.price}
                  </span>
                )}
              </div>
            )}

            {tags.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Tag className="w-3.5 h-3.5" /> {t("itemDetails.common.tags")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs">
                      #{t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {officialItem?.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {officialItem.description}
              </p>
            )}

            {/* アクション */}
            {user?.id !== ownerId && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Button
                  onClick={handleAddToCollection}
                  disabled={adding || !officialItemId || alreadyOwned}
                  className="w-full gap-1.5"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : alreadyOwned ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {alreadyOwned
                    ? t("itemDetails.publicItem.alreadyOwned")
                    : adding
                      ? t("itemDetails.common.adding")
                      : t("itemDetails.publicItem.addToMyCollection")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAddToWishlist}
                  disabled={wishing || !officialItemId || alreadyWished}
                  className="w-full gap-1.5"
                >
                  {wishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={
                        alreadyWished ? "w-4 h-4 fill-current text-rose-500" : "w-4 h-4"
                      }
                    />
                  )}
                  {alreadyWished
                    ? t("itemDetails.publicItem.alreadyWished")
                    : wishing
                      ? t("itemDetails.common.adding")
                      : t("itemDetails.publicItem.addToWishlist")}
                </Button>
                {!officialItemId && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    {t("itemDetails.publicItem.noOfficialNote")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
