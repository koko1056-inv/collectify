import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, Loader2, Check, X, Sparkles, ArrowLeft, Package, Tag, ScanBarcode, AlertTriangle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CategoryTagSelect } from "@/components/tag/CategoryTagSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarcodeScanner } from "./BarcodeScanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSimilarItemsCheck } from "@/hooks/admin-item-form/useSimilarItemsCheck";
import { addToCollection, incrementItemQuantity } from "@/utils/collection-actions";
import { copyTagsFromOfficialItem } from "@/utils/tag/tag-copy";
import { consumePendingItemPhoto, dataUrlToFile } from "@/utils/ai-studio-handoff";

interface AnalysisResult {
  title: string;
  description: string;
  price: string;
  category: string;
  contentName: string;
  characterName: string;
}

interface SelectedTags {
  character: string | null;
  type: string | null;
  series: string | null;
}

type Step = "capture" | "barcode" | "analyzing" | "confirm" | "complete";

interface SimilarItem {
  id: string;
  title: string;
  image: string;
}

/**
 * user_items の追加に失敗したときに、直前に作った official_item を取り消す（補償処理）。
 *
 * 本来は1つの RPC でトランザクションにすべきだが、そこまでやらずに整合を保つための後始末。
 * 「カタログにだけ存在して誰のコレクションにも無いゴミ」を残さないのが目的。
 * item_tags の ON DELETE 挙動に依存しないよう、タグ紐付けを先に消す。
 */
/** コレクション追加の失敗。専用トーストを出し終えている印として使う。 */
class CollectionAddFailed extends Error {
  constructor() {
    super("collection-add-failed");
    this.name = "CollectionAddFailed";
  }
}

async function rollbackOfficialItem(officialItemId: string, uploadedPath?: string | null) {
  try {
    await supabase.from("item_tags").delete().eq("official_item_id", officialItemId);
    await supabase.from("official_items").delete().eq("id", officialItemId);
    // 画像を残すとストレージに孤児ファイルが溜まるので一緒に消す
    if (uploadedPath) {
      await supabase.storage.from("kuji_images").remove([uploadedPath]);
    }
  } catch (error) {
    // 補償に失敗しても、利用者に伝えるべきは元のエラーなのでログだけ残す
    console.error("Failed to roll back official_item:", officialItemId, error);
  }
}

interface QuickAddFlowProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function QuickAddFlow({ onComplete, onCancel }: QuickAddFlowProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("capture");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedData, setEditedData] = useState<AnalysisResult | null>(null);
  const [selectedTags, setSelectedTags] = useState<SelectedTags>({
    character: null,
    type: null,
    series: null,
  });
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  /** 「これと同じ」で既存カタログに紐付けて完了したときのアイテム名（完了画面の文言を変える） */
  const [linkedExistingTitle, setLinkedExistingTitle] = useState<string | null>(null);
  /** 「これと同じ」を処理中の候補 id（その行だけスピナーにする） */
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const handoffHandledRef = useRef(false);
  const { user } = useAuth();

  // コンテンツ名からcontent_idを取得
  const { data: contentId } = useQuery({
    queryKey: ["content-id", editedData?.contentName],
    queryFn: async () => {
      if (!editedData?.contentName) return null;
      const { data } = await supabase
        .from("content_names")
        .select("id")
        .eq("name", editedData.contentName)
        .single();
      return data?.id || null;
    },
    enabled: !!editedData?.contentName,
  });

  /**
   * 撮影・選択された写真をAI解析して確認ステップへ進む。
   *
   * @param fallbackTitle 画像検索から引き継いだ推定名。AI がタイトルを取れなかったときの初期値に使う。
   */
  const handleFileSelect = useCallback(async (file: File, fallbackTitle?: string | null) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // 自動的にAI分析を開始
    setStep("analyzing");
    
    try {
      // Base64に変換
      const reader = new FileReader();
      const base64Url = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('analyze-item-image', {
        body: { imageUrl: base64Url }
      });

      if (error) throw error;

      const result: AnalysisResult = {
        title: data.title || fallbackTitle || "",
        description: data.description || "",
        price: data.price || "",
        category: data.category || "",
        contentName: data.contentName || "",
        characterName: data.characterName || "",
      };

      setAnalysisResult(result);
      setEditedData(result);
      setStep("confirm");
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error(t("misc.addItem.analyzeErrorTitle"), {
        description: t("misc.addItem.analyzeErrorDesc"),
      });
      // エラー時も確認画面へ（引き継いだ推定名だけは初期値に使う）
      const emptyResult: AnalysisResult = {
        title: fallbackTitle || "",
        description: "",
        price: "",
        category: "",
        contentName: "",
        characterName: "",
      };
      setAnalysisResult(emptyResult);
      setEditedData(emptyResult);
      setStep("confirm");
    }
  }, [t]);

  // 画像検索（/image-search）でヒットしなかった写真を引き継いで、そのまま登録フローに流す。
  // consumePendingItemPhoto は取り出した時点で削除するため、二重に走らせないよう ref で1回に絞る。
  useEffect(() => {
    if (handoffHandledRef.current) return;
    handoffHandledRef.current = true;

    const pending = consumePendingItemPhoto();
    if (!pending) return;

    const file = dataUrlToFile(pending.dataUrl, `handoff-${Date.now()}.jpg`);
    if (!file) {
      toast.error(t("screens.quickAdd.handoffFailedTitle"), {
        description: t("screens.quickAdd.handoffFailedDesc"),
      });
      return;
    }

    // 通常の撮影と同じ経路（AI解析 → 確認ステップ）に流す
    void handleFileSelect(file, pending.guessedTitle ?? null);
  }, [handleFileSelect, t]);

  // 写真からの登録は同じグッズを二重に作りやすいので、確認ステップでタイトルから既存カタログを照合する。
  // 確認ステップ以外では空文字を渡して問い合わせを止める。
  const { similarItems, isChecking: isCheckingSimilar } = useSimilarItemsCheck(
    step === "confirm" ? editedData?.title ?? "" : ""
  );

  // 空白だけのタイトルで登録させない（「無題のグッズ」がカタログに入るのを防ぐ）
  const trimmedTitle = editedData?.title.trim() ?? "";
  const isLinking = linkingItemId !== null;

  // 追加直後にコレクション件数・残り枠・ポイント表示を更新する
  const invalidateCollectionQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" }),
    ]);
  }, [queryClient]);

  /**
   * 「これと同じ」: 新しい official_item を作らず、既存カタログのアイテムを自分のコレクションに追加する。
   * 同じグッズでカタログが重複して汚れるのを防ぐのが目的。
   */
  const handleUseExisting = async (item: SimilarItem) => {
    if (!user) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setLinkingItemId(item.id);

    try {
      // すでに持っているものを二重に増やさない。
      // ここで error を捨てると判定をすり抜けて二重登録になるので必ず見る。
      const { count, error: existingError } = await supabase
        .from("user_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("official_item_id", item.id);

      if (existingError) throw existingError;

      if (count && count > 0) {
        // 何も追加していないので完了画面には進めない（「追加しました」は嘘になる）。
        // 代わりに所持数 +1 を提案する。
        toast(t("screens.quickAdd.alreadyOwnedTitle"), {
          description: t("screens.quickAdd.alreadyOwnedDesc"),
          action: {
            label: t("screens.quickAdd.incrementAction"),
            onClick: async () => {
              const inc = await incrementItemQuantity(user.id, item.id);
              if (inc.success) {
                toast.success(t("screens.quickAdd.incrementedTitle", { n: inc.quantity ?? 0 }));
                await invalidateCollectionQueries();
              } else {
                toast.error(t("screens.quickAdd.incrementFailed"));
              }
            },
          },
        });
        return;
      }

      // 枠チェックとポイント付与は addToCollection 側が持っている
      const result = await addToCollection({
        userId: user.id,
        title: item.title,
        image: item.image,
        officialItemId: item.id,
        contentName: editedData?.contentName || undefined,
        prize: editedData?.price || "0",
      });

      if (!result.success) {
        if (result.isAtLimit) {
          toast.error(t("screens.quickAdd.limitTitle"), {
            description: t("screens.quickAdd.limitDesc"),
          });
        } else {
          toast.error(t("misc.addItem.saveErrorTitle"), {
            description: result.error || t("misc.addItem.saveErrorDesc"),
          });
        }
        return;
      }

      // 既存カタログのタグをそのまま引き継ぐ
      if (result.userItemId) {
        await copyTagsFromOfficialItem(item.id, result.userItemId);
      }

      await invalidateCollectionQueries();
      setLinkedExistingTitle(item.title);
      setStep("complete");
    } catch (error) {
      console.error("Error linking existing item:", error);
      toast.error(t("misc.addItem.saveErrorTitle"), {
        description: t("misc.addItem.saveErrorDesc"),
      });
    } finally {
      setLinkingItemId(null);
      submitLockRef.current = false;
    }
  };

  const handleSubmit = async () => {
    if (!user || !imageFile || !editedData) return;

    // タイトル無しでの登録は許さない（以前は「無題のグッズ」でカタログに入っていた）
    const title = editedData.title.trim();
    if (!title) {
      toast.error(t("screens.quickAdd.titleRequiredTitle"), {
        description: t("screens.quickAdd.titleRequiredDesc"),
      });
      return;
    }

    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setIsSubmitting(true);
    try {
      // 画像をアップロード
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      // 1. official_itemsに追加（探索に表示されるように）
      const { data: officialItem, error: officialInsertError } = await supabase
        .from('official_items')
        .insert({
          title,
          image: publicUrl,
          price: editedData.price || "0",
          release_date: new Date().toISOString().split('T')[0],
          content_name: editedData.contentName || null,
          description: editedData.description || null,
          item_type: editedData.category || "goods",
          created_by: user.id,
        })
        .select()
        .single();

      if (officialInsertError) throw officialInsertError;

      // 2〜3 のどこかで失敗したら、作った official_item を取り消してから例外を投げ直す。
      // 完全な原子性には RPC が必要だが、少なくとも
      // 「カタログにだけ存在して誰のコレクションにも無い」中途半端な状態は残さない。
      let userItemId: string | null = null;
      try {
        // 2. タグを保存（item_tagsの重複を除外）
        const tagIds: string[] = [];
        for (const [category, tagName] of Object.entries(selectedTags)) {
          if (!tagName) continue;

          const { data: tagData } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .eq('category', category)
            .single();

          if (tagData?.id) tagIds.push(tagData.id);
        }

        const uniqueTagIds = Array.from(new Set(tagIds));
        if (uniqueTagIds.length > 0) {
          const { data: existingTagRows, error: existingTagsError } = await supabase
            .from('item_tags')
            .select('tag_id')
            .eq('official_item_id', officialItem.id)
            .in('tag_id', uniqueTagIds);

          if (existingTagsError) throw existingTagsError;

          const existingSet = new Set((existingTagRows || []).map(r => r.tag_id));
          const missingTagIds = uniqueTagIds.filter(id => !existingSet.has(id));

          if (missingTagIds.length > 0) {
            const { error: insertTagsError } = await supabase
              .from('item_tags')
              .insert(missingTagIds.map(tagId => ({
                official_item_id: officialItem.id,
                tag_id: tagId,
              })));
            if (insertTagsError) throw insertTagsError;
          }
        }

        // 3. 自分のコレクションへ追加。
        //    直接 insert すると枠上限チェックとポイント付与が抜けるため、
        //    「これと同じ」経路と同じく共通の addToCollection を通す。
        const collectionResult = await addToCollection({
          userId: user.id,
          title,
          image: publicUrl,
          officialItemId: officialItem.id,
          contentName: editedData.contentName || undefined,
          prize: editedData.price || "0",
          note: editedData.description || undefined,
        });

        if (!collectionResult.success) {
          // 枠上限で入らないなら、作ったカタログ行を残さず巻き戻す
          if (collectionResult.isAtLimit) {
            toast.error(t("screens.quickAdd.limitTitle"), {
              description: t("screens.quickAdd.limitDesc"),
            });
          } else {
            console.error("addToCollection failed:", collectionResult.error);
          }
          // 専用トーストは上で出しているので、外側の汎用トーストは抑制する
          throw new CollectionAddFailed();
        }

        userItemId = collectionResult.userItemId ?? null;
      } catch (stepError) {
        await rollbackOfficialItem(officialItem.id, filePath);
        throw stepError;
      }

      // 4. user_item_tagsにもタグを保存。
      //    ここは失敗しても本体（コレクション追加）は成立しているので巻き戻さない。
      if (userItemId) {
        for (const [category, tagName] of Object.entries(selectedTags)) {
          if (tagName) {
            const { data: tagData } = await supabase
              .from('tags')
              .select('id')
              .eq('name', tagName)
              .eq('category', category)
              .single();

            if (tagData) {
              await supabase.from('user_item_tags').insert({
                user_item_id: userItemId,
                tag_id: tagData.id,
              });
            }
          }
        }
      }

      await invalidateCollectionQueries();

      // 自動では閉じない。完了画面のボタンで次の行き先を選ばせる。
      setLinkedExistingTitle(null);
      setStep("complete");

    } catch (error) {
      console.error("Error saving item:", error);
      // 原因を特定して専用の文言を出している場合は、汎用の失敗トーストを重ねない
      if (!(error instanceof CollectionAddFailed)) {
        toast.error(t("misc.addItem.saveErrorTitle"), {
          description: t("misc.addItem.saveErrorDesc"),
        });
      }
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleReset = () => {
    setStep("capture");
    setImageFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setEditedData(null);
    setSelectedTags({ character: null, type: null, series: null });
    setScannedBarcode(null);
    setLinkedExistingTitle(null);
  };

  // バーコードスキャン結果の処理
  const handleBarcodeScan = async (barcode: string) => {
    setScannedBarcode(barcode);
    setStep("analyzing");
    
    try {
      // バーコードから商品情報を検索（ここでは基本的な情報をセット）
      // 将来的にはAPIを使って商品情報を取得可能
      const result: AnalysisResult = {
        title: "",
        description: `バーコード: ${barcode}`,
        price: "",
        category: "goods",
        contentName: "",
        characterName: "",
      };
      
      setAnalysisResult(result);
      setEditedData(result);
      
      toast.success(t("misc.addItem.barcodeReadTitle"), {
        description: t("misc.addItem.barcodeReadDesc", { code: barcode }),
      });
      
      setStep("confirm");
    } catch (error) {
      console.error("Barcode lookup error:", error);
      toast.error(t("misc.common.error"), {
        description: t("misc.addItem.barcodeLookupFailed"),
      });
      setStep("capture");
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col">
      <AnimatePresence mode="wait">
        {/* Step 1: キャプチャ */}
        {step === "capture" && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{t("misc.addItem.addGoods")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("misc.addItem.addGoodsSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-md">
              {/* カメラで撮影 */}
              <Button
                variant="outline"
                className="h-28 flex-col gap-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-8 h-8 text-primary" />
                <span className="font-medium text-xs">{t("misc.addItem.camera")}</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* ギャラリーから選択 */}
              <Button
                variant="outline"
                className="h-28 flex-col gap-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-primary" />
                <span className="font-medium text-xs">{t("misc.addItem.gallery")}</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* バーコードスキャン */}
              <Button
                variant="outline"
                className="h-28 flex-col gap-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                onClick={() => setStep("barcode")}
              >
                <ScanBarcode className="w-8 h-8 text-primary" />
                <span className="font-medium text-xs">{t("misc.addItem.barcode")}</span>
              </Button>
            </div>

            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="mt-4">
                {t("misc.common.cancel")}
              </Button>
            )}
          </motion.div>
        )}

        {/* バーコードスキャン画面 */}
        {step === "barcode" && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setStep("capture")}
          />
        )}

        {/* Step 2: AI分析中 */}
        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
          >
            {previewUrl && (
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Sparkles className="w-10 h-10 text-white mx-auto animate-pulse" />
                    <p className="text-white font-medium text-sm">{t("misc.addItem.aiAnalyzing")}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t("misc.addItem.autoRecognizing")}</span>
            </div>
          </motion.div>
        )}

        {/* Step 3: 確認・編集 */}
        {step === "confirm" && editedData && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 p-4 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold flex-1">{t("misc.addItem.confirmContent")}</h2>
            </div>

            {/* 画像プレビュー */}
            {previewUrl && (
              <div className="relative w-full max-w-xs mx-auto aspect-square rounded-xl overflow-hidden shadow-lg">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t("misc.addItem.aiDone")}
                </div>
              </div>
            )}

            {/* 編集フォーム */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t("misc.addItem.itemName")}</Label>
                  <Input
                    id="title"
                    value={editedData.title}
                    onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                    placeholder={t("misc.addItem.itemNamePlaceholder")}
                    aria-invalid={!trimmedTitle}
                  />
                  {!trimmedTitle && (
                    <p className="text-xs text-muted-foreground">
                      {t("screens.quickAdd.titleRequiredDesc")}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">{t("misc.addItem.price")}</Label>
                    <Input
                      id="price"
                      value={editedData.price}
                      onChange={(e) => setEditedData({ ...editedData, price: e.target.value })}
                      placeholder="0"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">{t("misc.addItem.category")}</Label>
                    <Input
                      id="category"
                      value={editedData.category}
                      onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                      placeholder={t("misc.addItem.category")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contentName">{t("misc.addItem.contentName")}</Label>
                  <Input
                    id="contentName"
                    value={editedData.contentName}
                    onChange={(e) => setEditedData({ ...editedData, contentName: e.target.value })}
                    placeholder={t("misc.addItem.contentNamePlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 重複候補。写真からの登録は同じグッズを二重にカタログへ入れやすいので警告する。 */}
            {isCheckingSimilar && similarItems.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("screens.quickAdd.similarChecking")}</span>
              </div>
            )}

            {similarItems.length > 0 && (
              <Alert className="border-amber-500/40 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-foreground">
                  <div className="font-semibold">{t("screens.quickAdd.similarHeading")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("screens.quickAdd.similarNote")}
                  </p>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {similarItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-12 h-12 shrink-0 rounded object-cover"
                        />
                        <span className="min-w-0 flex-1 break-words text-sm">{item.title}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="shrink-0 gap-1.5"
                          disabled={isSubmitting || isLinking}
                          onClick={() => handleUseExisting(item)}
                        >
                          {linkingItemId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                          {t("screens.quickAdd.useThisOne")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* タグ選択 */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="w-4 h-4" />
                  {t("misc.addItem.setTags")}
                </div>
                
                <CategoryTagSelect
                  category="character"
                  label={t("misc.addItem.tagCharacter")}
                  value={selectedTags.character}
                  onChange={(value) => setSelectedTags(prev => ({ ...prev, character: value }))}
                  contentId={contentId}
                />
                
                <CategoryTagSelect
                  category="type"
                  label={t("misc.addItem.tagType")}
                  value={selectedTags.type}
                  onChange={(value) => setSelectedTags(prev => ({ ...prev, type: value }))}
                />
                
                <CategoryTagSelect
                  category="series"
                  label={t("misc.addItem.tagSeries")}
                  value={selectedTags.series}
                  onChange={(value) => setSelectedTags(prev => ({ ...prev, series: value }))}
                  contentId={contentId}
                />

                {/* 選択中のタグ表示 */}
                {(selectedTags.character || selectedTags.type || selectedTags.series) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {selectedTags.character && (
                      <Badge variant="secondary">{selectedTags.character}</Badge>
                    )}
                    {selectedTags.type && (
                      <Badge variant="outline">{selectedTags.type}</Badge>
                    )}
                    {selectedTags.series && (
                      <Badge variant="outline">{selectedTags.series}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* アクションボタン */}
            <div className="space-y-2">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                  disabled={isSubmitting || isLinking}
                >
                  {t("misc.addItem.startOver")}
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLinking || !trimmedTitle}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("misc.common.saving")}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {t("misc.addItem.addToCollection")}
                    </>
                  )}
                </Button>
              </div>
              {/* なぜ押せないのかを明示する（以前は無効なだけで理由が分からなかった） */}
              {!trimmedTitle && (
                <p className="text-center text-xs text-muted-foreground">
                  {t("screens.quickAdd.submitDisabledReason")}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4: 完了 */}
        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>

            <div className="text-center space-y-2">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-green-600"
              >
                {t("misc.addItem.addedTitle")}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                {linkedExistingTitle
                  ? t("screens.quickAdd.linkedExistingDesc", { title: linkedExistingTitle })
                  : t("misc.addItem.addedDesc")}
              </motion.p>
            </div>

            {/* キラキラエフェクト */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-2"
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: [0, 1.2, 1], rotate: [0, 180] }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                  className="text-2xl"
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>

            {/* 自動では閉じないので、次にどうするかはここで選んでもらう */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4 w-full max-w-xs">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                {t("screens.quickAdd.continueAdding")}
              </Button>
              <Button className="flex-1" onClick={() => onComplete?.()}>
                {t("screens.quickAdd.viewCollection")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
