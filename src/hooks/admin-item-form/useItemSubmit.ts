
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addTagToItem } from "@/utils/tag/tag-mutations";
import { copyTagsFromOfficialItem } from "@/utils/tag/tag-copy";
import { addToCollection } from "@/utils/collection-actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { claimReward } from "@/hooks/useClaimReward";
import { notifyNewTag } from "@/utils/notify-new-tag";

interface FormDataType {
  title: string;
  description: string;
  content_name?: string | null;
  item_type?: string;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
}

interface UseItemSubmitProps {
  formData: FormDataType;
  uploadImage: () => Promise<string>;
  selectedTags: string[];
  resetForm: () => void;
  /** 「みんなのカタログにも登録する」。false のとき official_items には入れず、自分のコレクションにだけ追加する */
  shareToCatalog?: boolean;
  /** 「自分のコレクションに追加する」。false ならカタログ登録のみ（枠を消費しない） */
  addToOwnCollection?: boolean;
  /** アップロード対象のファイルが無い（既にURLの画像を選んだ）ときの画像URL */
  fallbackImageUrl?: string | null;
}

export function useItemSubmit({
  formData,
  uploadImage,
  selectedTags,
  resetForm,
  shareToCatalog = true,
  addToOwnCollection = true,
  fallbackImageUrl = null,
}: UseItemSubmitProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();

  const validateForm = () => {
    // user_items は user_id が必須なのでログイン必須
    if (!user) {
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.common.loginRequired"),
      });
      return false;
    }

    // タイトルのバリデーション
    if (!formData.title.trim()) {
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.adminItem.titleRequiredDesc"),
      });
      return false;
    }

    return true;
  };

  const createOrGetTag = async (name: string, category: string | null = null, contentId: string | null = null) => {
    if (!name) return null;
    
    console.log(`Creating/getting tag: "${name}" with category: "${category}", contentId: "${contentId}"`);

    // 既存のタグを検索（character/seriesはcontent_idも考慮）
    let query = supabase
      .from("tags")
      .select("id, name, category, content_id")
      .eq("name", name)
      .eq("category", category);

    // character/seriesカテゴリの場合はcontent_idでフィルタリング
    if ((category === 'character' || category === 'series') && contentId) {
      query = query.eq("content_id", contentId);
    } else if (category === 'type') {
      // typeカテゴリはcontent_idがnullのもののみ
      query = query.is("content_id", null);
    }

    const { data: existingTag, error: searchError } = await query.maybeSingle();

    if (searchError) {
      console.error("Error searching for tag:", searchError);
      throw searchError;
    }

    if (existingTag) {
      console.log(`Found existing tag: ${JSON.stringify(existingTag)}`);
      return existingTag.id;
    }

    // タグが存在しない場合は新規作成
    console.log(`Creating new tag: "${name}" with category: "${category}", content_id: "${contentId}"`);
    
    // character/seriesはcontent_idを付与、typeはnull
    const insertData: any = { name, category };
    if ((category === 'character' || category === 'series') && contentId) {
      insertData.content_id = contentId;
    }
    
    const { data: newTag, error: createError } = await supabase
      .from("tags")
      .insert([insertData])
      .select()
      .single();

    if (createError) {
      console.error("Error creating tag:", createError);
      throw createError;
    }
    
    console.log(`Created new tag: ${JSON.stringify(newTag)}`);
    // 自由入力のタグはここで初めて作られるので、ここでも通知する
    notifyNewTag({
      name,
      category,
      contentName: formData.content_name ?? null,
      source: "useItemSubmit",
    });
    return newTag.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!user) return;

    setLoading(true);

    try {
      const uploadedUrl = await uploadImage();
      const imageUrl = uploadedUrl || fallbackImageUrl || "";

      // データベースに保存するデータから、不要なフィールドを除外
      const { characterTag, typeTag, seriesTag, ...dbFormData } = formData;

      console.log("Form data:", formData);

      // カタログ（official_items）への登録は任意。OFFなら自分のコレクションにだけ入れる。
      let officialItemId: string | null = null;

      if (shareToCatalog) {
        // categoryフィールドはデータベースに存在しないため、削除
        const dataToInsert = {
          title: dbFormData.title,
          description: dbFormData.description || "",
          content_name: dbFormData.content_name || null,
          item_type: dbFormData.item_type || "official",
          image: imageUrl,
          price: "0",
          release_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
        };

        const { data: itemData, error: itemError } = await supabase
          .from("official_items")
          .insert([dataToInsert])
          .select()
          .single();

        if (itemError) throw itemError;

        console.log("Created item:", itemData);
        officialItemId = itemData.id;
      }

      // content_nameからcontent_idを取得
      let contentId: string | null = null;
      if (formData.content_name) {
        const { data: contentData } = await supabase
          .from("content_names")
          .select("id")
          .eq("name", formData.content_name)
          .maybeSingle();
        
        contentId = contentData?.id || null;
        console.log(`Content ID for "${formData.content_name}": ${contentId}`);
      }

      // カテゴリータグの処理（必須3種類）
      const categoryTags = [
        { name: characterTag, category: 'character', needsContentId: true },
        { name: typeTag, category: 'type', needsContentId: false },
        { name: seriesTag, category: 'series', needsContentId: true }
      ];

      console.log("Processing category tags:", categoryTags);

      // 作成/取得したタグIDを覚えておく（カタログに登録しない場合は
      // official_item が無いので user_item に直接付け直す必要がある）
      const tagIds: string[] = [];

      // カテゴリータグを先に処理（これらは必須）
      for (const tag of categoryTags) {
        try {
          if (!tag.name) {
            console.error(`Missing required category tag: ${tag.category}`);
            continue;
          }

          // character/seriesの場合はcontentIdを渡す
          const tagContentId = tag.needsContentId ? contentId : null;
          const tagId = await createOrGetTag(tag.name, tag.category, tagContentId);
          if (tagId) {
            tagIds.push(tagId);
            if (officialItemId) {
              await addTagToItem(officialItemId, tagId, false);
            }
            console.log(`Added ${tag.category} tag: ${tag.name} (content_id: ${tagContentId})`);
          }
        } catch (error) {
          console.error(`Error processing category tag ${tag.name}:`, error);
        }
      }

      // 追加のタグを処理（任意）
      console.log("Processing additional tags:", selectedTags);
      for (const tagName of selectedTags) {
        try {
          if (!tagName) continue;
          const tagId = await createOrGetTag(tagName, null);
          if (tagId) {
            tagIds.push(tagId);
            if (officialItemId) {
              await addTagToItem(officialItemId, tagId, false);
            }
            console.log(`Added additional tag: ${tagName}`);
          }
        } catch (error) {
          console.error(`Error processing tag ${tagName}:`, error);
        }
      }

      // 自分のコレクション（user_items）にも追加する。
      // 枠上限チェック・ポイント付与は addToCollection が持っている。
      // カタログ整備だけしたい場合（/admin など）は addToOwnCollection を外せる。
      const collectionResult = !addToOwnCollection
        ? null
        : await addToCollection({
            userId: user.id,
            title: formData.title,
            image: imageUrl,
            officialItemId: officialItemId ?? undefined,
            contentName: formData.content_name || undefined,
            // カタログに登録しない場合、説明の保存先が official_items に無いので
            // 自分のコレクション側のメモに残す（黙って失わないため）
            note: !shareToCatalog ? formData.description || undefined : undefined,
            releaseDate: new Date().toISOString().split('T')[0],
            prize: "0",
          });

      // タグを user_item 側にもコピーする
      if (collectionResult?.success && collectionResult.userItemId) {
        try {
          if (officialItemId) {
            await copyTagsFromOfficialItem(officialItemId, collectionResult.userItemId);
          } else {
            for (const tagId of Array.from(new Set(tagIds))) {
              await addTagToItem(collectionResult.userItemId, tagId, true);
            }
          }
        } catch (error) {
          console.error("Error copying tags to user item:", error);
        }
      }

      // グッズ登録ポイント。付与額と二重付与の判定はサーバー側（claim_reward）が持つ。
      // 表示の合計に含めるため、カタログ登録分（official_item_add = 5pt）も数える。
      const CATALOG_REGISTER_POINTS = 5;
      let catalogPoints = 0;
      if (officialItemId && (await claimReward("official_item_add", officialItemId))) {
        catalogPoints = CATALOG_REGISTER_POINTS;
        await queryClient.invalidateQueries({ queryKey: ["pointTransactions"], refetchType: "all" });
      }
      const totalPointsAwarded = (collectionResult.pointsAwarded ?? 0) + catalogPoints;

      await queryClient.invalidateQueries({ queryKey: ["official-items"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["tags"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["item-tags-count"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["hero-stats", user.id], refetchType: "all" });

      // 実際に起きたことに合わせて伝える。コレクションに入っていないなら成功扱いにしない。
      if (!collectionResult) {
        // コレクションには入れない選択（カタログ整備のみ）
        toast.success(t("notices.adminItem.catalogOnlyTitle"), {
          description: totalPointsAwarded
            ? t("notices.adminItem.pointsEarnedDesc", { n: totalPointsAwarded })
            : t("notices.adminItem.catalogOnlyDesc"),
        });
        resetForm();
      } else if (collectionResult.success) {
        toast.success(t("notices.adminItem.addedToCollectionTitle"), {
          description: totalPointsAwarded
            ? t("notices.adminItem.pointsEarnedDesc", { n: totalPointsAwarded })
            : shareToCatalog
              ? t("notices.adminItem.alsoInCatalogDesc")
              : t("notices.adminItem.collectionOnlyDesc"),
        });
        resetForm();
      } else if (collectionResult.isAtLimit) {
        toast.error(t("notices.adminItem.limitTitle"), {
          description: shareToCatalog
            ? t("notices.adminItem.limitWithCatalogDesc", { max: collectionResult.maxSlots ?? 0 })
            : t("notices.adminItem.limitDesc", { max: collectionResult.maxSlots ?? 0 }),
        });
        // カタログには入ったのでフォームは片付ける（枠を空けてからの再送信は別操作）
        if (shareToCatalog) resetForm();
      } else {
        // collectionResult.error は Supabase の技術的メッセージなので表示しない
        console.error("addToCollection failed:", collectionResult.error);
        toast.error(t("notices.common.errorTitle"), {
          description: shareToCatalog
            ? t("notices.adminItem.collectionFailedWithCatalogDesc")
            : t("notices.adminItem.collectionFailedDesc"),
        });
        if (shareToCatalog) resetForm();
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.adminItem.addFailedDesc"),
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit,
  };
}
