
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SlotUsageMeter } from "@/components/shop/SlotUsageMeter";
import { ImageSection, type AnalysisResult } from "./admin-item-form/ImageSection";
import { ItemDetailsSection } from "./admin-item-form/ItemDetailsSection";
import { MultipleItemsForm } from "./admin-item-form/MultipleItemsForm";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useItemDetails } from "@/hooks/admin-item-form/useItemDetails";
import { useItemSubmit } from "@/hooks/admin-item-form/useItemSubmit";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addToCollection } from "@/utils/collection-actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";

export function AdminItemForm() {
  const [currentStep, setCurrentStep] = useState("step1");
  const [step1Completed, setStep1Completed] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; title: string | null }>>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  // 一括登録で自分のコレクションにも入れるか。件数分の枠を使うので既定OFF。
  const [bulkAddToCollection, setBulkAddToCollection] = useState(false);
  // 既定ON: カタログにも登録して他の人が同じグッズを見つけられるようにする
  const [shareToCatalog, setShareToCatalog] = useState(true);
  const bulkSubmittingRef = useRef(false);
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const {
    imageFile,
    setImageFile,
    previewUrl,
    setPreviewUrl,
    uploadImage,
  } = useImageUpload();

  const {
    formData,
    setFormData,
    selectedTags,
    setSelectedTags,
  } = useItemDetails();

  const [formKey, setFormKey] = useState(0);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      content_name: null,
      characterTag: null,
      typeTag: null,
      seriesTag: null,
      price: "",
      item_type: "official",
    });
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedTags([]);
    setCurrentStep("step1");
    setStep1Completed(false);
    setSelectedImages([]);
    setIsMultipleMode(false);
    setShareToCatalog(true);
    setFormKey(prev => prev + 1);
  };

  const { loading, handleSubmit } = useItemSubmit({
    formData,
    uploadImage,
    selectedTags,
    resetForm,
    shareToCatalog,
    // ファイル選択ではなくURLの画像を選んだ場合はそのURLをそのまま使う
    fallbackImageUrl: previewUrl && !previewUrl.startsWith("blob:") ? previewUrl : null,
  });

  const handleFormUpdate = (updates: Partial<typeof formData>) => {
    setFormData(prevData => ({ ...prevData, ...updates }));
  };

  const handleNextStep = () => {
    if (currentStep === "step1" && (imageFile || previewUrl)) {
      setStep1Completed(true);
      setCurrentStep("step2");
    }
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const canProceedToStep2 = imageFile || previewUrl;

  return (
    <div className="space-y-4">
      {/* ステップインジケーター */}
      <div className="flex items-center justify-center gap-4 py-4">
        <div 
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer",
            currentStep === "step1" 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
              : step1Completed 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-muted text-muted-foreground"
          )}
          onClick={() => setCurrentStep("step1")}
        >
          <span className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
            currentStep === "step1" 
              ? "bg-primary-foreground text-primary" 
              : step1Completed 
                ? "bg-green-500 text-white" 
                : "bg-muted-foreground/30 text-muted-foreground"
          )}>
            {step1Completed ? <Check className="w-4 h-4" /> : "1"}
          </span>
          <span className="text-sm font-medium hidden sm:inline">{t("chrome.adminForm.step1")}</span>
        </div>

        <div className={cn(
          "w-8 h-0.5 rounded-full transition-colors",
          step1Completed ? "bg-green-500" : "bg-muted"
        )} />

        <div 
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
            currentStep === "step2" 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
              : !step1Completed 
                ? "bg-muted text-muted-foreground opacity-50" 
                : "bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80"
          )}
          onClick={() => step1Completed && setCurrentStep("step2")}
        >
          <span className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
            currentStep === "step2" 
              ? "bg-primary-foreground text-primary" 
              : "bg-muted-foreground/30 text-muted-foreground"
          )}>
            2
          </span>
          <span className="text-sm font-medium hidden sm:inline">{t("chrome.adminForm.step2")}</span>
        </div>
      </div>

      {/* メインコンテンツ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          {/* 送信前に枠の残りが分かるようにする。
              枠拡張ボタンが form の submit として発火しないよう form の外に置く */}
          <div className="mb-6">
            {currentStep === "step1" ? (
              <SlotUsageMeter type="collection" />
            ) : (
              // 実際に枠を消費する送信ボタンは step2 にあるので、ここでも残りを見せる
              <SlotUsageMeter type="collection" compact />
            )}
          </div>

          <form key={formKey} onSubmit={handleSubmit}>
            {currentStep === "step1" && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold mb-1">{t("chrome.adminForm.addImageTitle")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("chrome.adminForm.addImageDesc")}
                  </p>
                </div>

                <ImageSection
                  imageFile={imageFile}
                  setImageFile={handleImageChange}
                  previewUrl={previewUrl}
                  setPreviewUrl={setPreviewUrl}
                  onAnalysisComplete={(result) => {
                    if (result.selectedImages && result.selectedImages.length > 0) {
                      setSelectedImages(result.selectedImages);
                      setIsMultipleMode(true);
                      setStep1Completed(true);
                      setCurrentStep("step2");
                      
                      toast.success(t("addItem.imageSelectedTitle"), {
                        description: t("chrome.adminForm.imagesSelectedDesc", { n: result.selectedImages.length }),
                      });
                    } else {
                      const updates: any = {};
                      
                      if (result.title) updates.title = result.title;
                      if (result.description) updates.description = result.description;
                      if (result.price) updates.price = result.price;
                      if (result.category) updates.category = result.category;
                      if (result.contentName) updates.content_name = result.contentName;
                      
                      handleFormUpdate(updates);
                      setIsMultipleMode(false);
                    }
                  }}
                />
                
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    type="button"
                    onClick={handleNextStep}
                    disabled={!canProceedToStep2}
                    size="lg"
                    className="px-8 gap-2"
                  >
                    {t("chrome.adminForm.next")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "step2" && (
              <div className="space-y-6">
                {isMultipleMode ? (
                  <>
                    {/* 一括登録は件数分の枠を一気に使うので、
                        単数登録と違って既定OFF。黙って挙動を変えず明示的に選ばせる。 */}
                    <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 cursor-pointer">
                      <Checkbox
                        checked={bulkAddToCollection}
                        onCheckedChange={(v) => setBulkAddToCollection(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        <span className="font-medium">
                          {t("chrome.adminForm.bulkAlsoToCollection")}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {t("chrome.adminForm.bulkAlsoToCollectionHint", {
                            n: selectedImages.length,
                          })}
                        </span>
                      </span>
                    </label>
                  <MultipleItemsForm
                    images={selectedImages}
                    onSubmit={async (items) => {
                      if (bulkSubmittingRef.current) return;
                      bulkSubmittingRef.current = true;

                      const user = (await supabase.auth.getUser()).data.user;
                      try {
                        if (!user) {
                          toast.error(t("common.error"), {
                            description: t("addItem.loginRequired"),
                          });
                          return;
                        }

                        let successCount = 0;
                        let errorCount = 0;

                        // 各アイテムを並列で処理
                        const results = await Promise.all(items.map(async (item) => {
                          try {
                            let publicUrl = item.imageUrl;

                            const isAlreadyUploaded = item.imageUrl.includes('/storage/v1/object/public/');
                            if (!isAlreadyUploaded) {
                              try {
                                const response = await fetch(item.imageUrl);
                                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                                const blob = await response.blob();
                                const file = new File([blob], `item-${Date.now()}.jpg`, { type: blob.type });

                                const fileExt = file.name.split('.').pop();
                                const fileName = `${Math.random()}.${fileExt}`;
                                const filePath = `${user.id}/${fileName}`;

                                const { error: uploadError } = await supabase.storage
                                  .from('kuji_images')
                                  .upload(filePath, file);

                                if (uploadError) throw uploadError;

                                const { data: { publicUrl: uploadedUrl } } = supabase.storage
                                  .from('kuji_images')
                                  .getPublicUrl(filePath);
                                publicUrl = uploadedUrl;
                              } catch (fetchErr) {
                                console.warn('Image fetch failed, using original URL:', fetchErr);
                                publicUrl = item.imageUrl;
                              }
                            }

                            const { data: newItem, error: insertError } = await supabase
                              .from('official_items')
                              .insert({
                                title: item.title,
                                description: item.description || null,
                                image: publicUrl,
                                price: item.price,
                                content_name: item.content_name || null,
                                created_by: user.id,
                                release_date: new Date().toISOString(),
                                item_type: item.item_type || 'official',
                              })
                              .select()
                              .single();

                            if (insertError) throw insertError;

                            if (newItem) {
                              const tagIds = [
                                item.characterTagId,
                                item.typeTagId,
                                item.seriesTagId
                              ].filter(Boolean) as string[];

                              const uniqueTagIds = Array.from(new Set(tagIds));
                              if (uniqueTagIds.length > 0) {
                                const tagInserts = uniqueTagIds.map(tagId => ({
                                  official_item_id: newItem.id,
                                  tag_id: tagId,
                                }));
                                const { error: tagError } = await supabase.from('item_tags').insert(tagInserts);
                                if (tagError) console.error('Error inserting tags:', tagError);
                              }
                            }

                            // 選択されていれば自分のコレクションにも入れる。
                            // 枠上限チェックとポイント付与は addToCollection が持っている。
                            if (bulkAddToCollection && newItem) {
                              const collectionResult = await addToCollection({
                                userId: user.id,
                                title: item.title,
                                image: publicUrl,
                                officialItemId: newItem.id,
                                contentName: item.content_name || undefined,
                                prize: item.price,
                              });
                              if (!collectionResult.success) {
                                // カタログ登録自体は成功しているので ok は保ちつつ、
                                // 枠に入らなかったことは呼び出し側で数える
                                console.error(
                                  "bulk addToCollection failed:",
                                  collectionResult.isAtLimit ? "at-limit" : collectionResult.error
                                );
                                return { ok: true, collectionSkipped: true };
                              }
                            }

                            return { ok: true, collectionSkipped: false };
                          } catch (error) {
                            console.error('Error creating item:', error);
                            return { ok: false, collectionSkipped: false };
                          }
                        }));

                        successCount = results.filter(r => r.ok).length;
                        errorCount = results.filter(r => !r.ok).length;
                        const collectionSkipped = results.filter(r => r.collectionSkipped).length;

                        if (successCount > 0) {
                          // 探すページ等のキャッシュを即時無効化＋再取得
                          await queryClient.invalidateQueries({ queryKey: ["official-items"] });
                          await queryClient.refetchQueries({ queryKey: ["official-items"] });

                          toast.success(t("addItem.registrationComplete"), {
                            description: errorCount > 0
                              ? t("chrome.adminForm.registeredWithFailuresDesc", { n: successCount, failed: errorCount })
                              : collectionSkipped > 0
                                // カタログには入ったがコレクション枠に入らなかった分を隠さない
                                ? t("chrome.adminForm.registeredCollectionSkippedDesc", { n: successCount, skipped: collectionSkipped })
                                : t("chrome.adminForm.registeredDesc", { n: successCount }),
                          });
                          resetForm();
                        } else {
                          toast.error(t("common.error"), {
                            description: t("addItem.registrationError"),
                          });
                        }
                      } finally {
                        bulkSubmittingRef.current = false;
                      }
                    }}
                    onBack={() => {
                      setCurrentStep("step1");
                      setIsMultipleMode(false);
                      setSelectedImages([]);
                    }}
                  />
                  </>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h2 className="text-lg font-semibold mb-1">{t("chrome.adminForm.detailsTitle")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {t("chrome.adminForm.detailsDesc")}
                      </p>
                    </div>

                    {/* プレビュー画像 */}
                    {previewUrl && (
                      <div className="flex justify-center mb-6">
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
                          <img 
                            src={previewUrl} 
                            alt={t("chrome.adminForm.previewAlt")} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    <ItemDetailsSection
                      formData={formData}
                      onUpdate={handleFormUpdate}
                      selectedTags={selectedTags}
                      onTagsChange={setSelectedTags}
                    />

                    {/* カタログにも登録するか。OFFなら自分のコレクションにだけ入る */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
                      <Checkbox
                        id="share-to-catalog"
                        checked={shareToCatalog}
                        onCheckedChange={(checked) => setShareToCatalog(checked === true)}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="share-to-catalog" className="text-sm font-medium cursor-pointer">
                          {t("notices.adminItem.shareToCatalogLabel")}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t("notices.adminItem.shareToCatalogHint")}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("step1")}
                        className="gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        {t("chrome.common.back")}
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        size="lg"
                        className="px-8 gap-2"
                      >
                        {loading ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            {t("chrome.interests.adding")}
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            {t("chrome.collection.addGoods")}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
