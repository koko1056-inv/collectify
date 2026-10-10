import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { addToCollection, incrementItemQuantity } from "@/utils/collection-actions";

export interface OfficialItemSummary {
  id: string;
  title: string;
  image: string;
  releaseDate?: string | null;
  price?: string | null;
}

/**
 * 公式グッズを自分のコレクションに入れる（グッズ詳細の各所で共通）。
 * 上限チェック・二重登録の確認（所持数 +1 の提案）・タグのコピー・トーストまでをまとめて行う。
 */
export function useAddOfficialItem({ onAdded }: { onAdded?: () => Promise<unknown> | void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [isIncrementing, setIsIncrementing] = useState(false);

  // 既に持っているグッズの所持数を +1 する（2個目以降を記録する導線）。
  // ポイントは付与しない（同じ official_item への2回目はサーバー側が弾くため呼ばない）。
  const increment = async (itemId: string) => {
    if (!user) {
      toast.error(t("itemDetails.common.error"), { description: t("itemDetails.buttons.collectionLoginRequired") });
      return;
    }
    setIsIncrementing(true);
    try {
      const result = await incrementItemQuantity(user.id, itemId);
      if (!result.success) {
        // 見つからない（この公式グッズに紐づく行が無い）のと、更新に失敗したのを区別する
        toast.error(t("itemDetails.common.error"), {
          description: result.notFound
            ? t("collectionScreen.addFlow.incrementNotFound")
            : t("collectionScreen.addFlow.incrementFailed"),
        });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" });
      toast.success(t("collectionScreen.addFlow.incrementedTo", { count: result.quantity ?? 0 }));
    } finally {
      setIsIncrementing(false);
    }
  };

  const add = async (item: OfficialItemSummary) => {
    if (!user) {
      toast.error(t("itemDetails.common.error"), { description: t("itemDetails.buttons.collectionLoginRequired") });
      return;
    }
    setIsAdding(true);
    try {
      // 既にコレクションにある場合は重複追加せず、所持数 +1 を提案する
      const { count: existingCount } = await supabase
        .from("user_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("official_item_id", item.id);

      if (existingCount && existingCount > 0) {
        toast(t("collectionScreen.addFlow.alreadyAddedTitle"), {
          description: t("collectionScreen.addFlow.alreadyAddedDesc"),
          action: {
            label: t("collectionScreen.addFlow.incrementAction"),
            onClick: () => {
              void increment(item.id);
            },
          },
        });
        await onAdded?.();
        return;
      }

      // 上限チェック付きでコレクションに追加
      const result = await addToCollection({
        userId: user.id,
        title: item.title,
        image: item.image,
        officialItemId: item.id,
        releaseDate: item.releaseDate ?? "",
        prize: item.price || "0",
      });

      if (!result.success) {
        if (result.isAtLimit) {
          toast.error(t("collectionScreen.addFlow.limitTitle"), {
            description: result.maxSlots
              ? t("collectionScreen.addFlow.limitDescWithMax", { max: result.maxSlots })
              : t("collectionScreen.addFlow.limitDesc"),
          });
          navigate("/point-shop");
        } else {
          // result.error は Supabase の技術的なメッセージなので画面には出さない（ログのみ）
          if (result.error) console.error("addToCollection failed:", result.error);
          toast.error(t("itemDetails.common.error"), { description: t("itemDetails.buttons.collectionAddFailed") });
        }
        return;
      }

      // タグをコピー
      if (result.userItemId) {
        const { data: tags, error: tagsError } = await supabase
          .from("item_tags")
          .select("tag_id")
          .eq("official_item_id", item.id);
        if (!tagsError && tags && tags.length > 0) {
          await supabase
            .from("user_item_tags")
            .insert(tags.map((tag) => ({ user_item_id: result.userItemId!, tag_id: tag.tag_id })));
        }
      }

      await onAdded?.();
      for (const queryKey of [
        ["user-items"],
        ["item-owners-count", item.id],
        ["userPoints"],
        ["collectionCount"],
        ["hero-stats", user.id],
      ]) {
        await queryClient.invalidateQueries({ queryKey, refetchType: "all" });
      }

      toast.success(t("itemDetails.buttons.addedToCollection"), {
        description: result.pointsAwarded
          ? t("itemDetails.buttons.pointsEarned", { count: result.pointsAwarded })
          : undefined,
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast.error(t("itemDetails.common.error"), { description: t("itemDetails.buttons.collectionAddFailed") });
    } finally {
      setIsAdding(false);
    }
  };

  return { add, increment, isAdding, isIncrementing };
}
