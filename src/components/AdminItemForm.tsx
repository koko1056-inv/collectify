
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageSection, type AnalysisResult } from "./admin-item-form/ImageSection";
import { ItemDetailsSection } from "./admin-item-form/ItemDetailsSection";
import { MultipleItemsForm } from "./admin-item-form/MultipleItemsForm";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useItemDetails } from "@/hooks/admin-item-form/useItemDetails";
import { useItemSubmit } from "@/hooks/admin-item-form/useItemSubmit";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export function AdminItemForm() {
  const [currentStep, setCurrentStep] = useState("step1");
  const [step1Completed, setStep1Completed] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; title: string | null }>>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

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
    setFormKey(prev => prev + 1);
  };

  const { loading, handleSubmit } = useItemSubmit({
    formData,
    uploadImage,
    selectedTags,
    resetForm,
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
          <span className="text-sm font-medium hidden sm:inline">画像を選択</span>
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
          <span className="text-sm font-medium hidden sm:inline">詳細を入力</span>
        </div>
      </div>

      {/* メインコンテンツ */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <form key={formKey} onSubmit={handleSubmit}>
            {currentStep === "step1" && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold mb-1">グッズの画像を追加</h2>
                  <p className="text-sm text-muted-foreground">
                    画像URL、ファイルアップロード、またはWebサイトから取得できます
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
                      
                      toast({
                        title: t("addItem.imageSelectedTitle"),
                        description: `${result.selectedImages.length}${t("addItem.imagesSelected")}`,
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
                    次へ進む
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "step2" && (
              <div className="space-y-6">
                {isMultipleMode ? (
                  <MultipleItemsForm
                    images={selectedImages}
                    onSubmit={async (items) => {
                      const user = (await supabase.auth.getUser()).data.user;
                      if (!user) {
                        toast({
                          title: t("common.error"),
                          description: t("addItem.loginRequired"),
                          variant: "destructive",
                        });
                        return;
                      }

                      let successCount = 0;
                      let errorCount = 0;

                      for (const item of items) {
                        try {
                          const response = await fetch(item.imageUrl);
                          const blob = await response.blob();
                          const file = new File([blob], `item-${Date.now()}.jpg`, { type: blob.type });
                          
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${Math.random()}.${fileExt}`;
                          const filePath = `${user.id}/${fileName}`;

                          const { error: uploadError } = await supabase.storage
                            .from('kuji_images')
                            .upload(filePath, file);

                          if (uploadError) throw uploadError;

                          const { data: { publicUrl } } = supabase.storage
                            .from('kuji_images')
                            .getPublicUrl(filePath);

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
                            // タグ名からタグIDを取得してitem_tagsに挿入
                            const tagNames = [item.characterTag, item.typeTag, item.seriesTag].filter(Boolean);
                            
                            if (tagNames.length > 0) {
                              // タグ名からタグIDを取得
                              const { data: tagData } = await supabase
                                .from('tags')
                                .select('id, name')
                                .in('name', tagNames);
                              
                              if (tagData && tagData.length > 0) {
                                const tagInserts = tagData.map(tag => ({
                                  official_item_id: newItem.id,
                                  tag_id: tag.id,
                                }));

                                const { error: tagError } = await supabase.from('item_tags').insert(tagInserts);
                                if (tagError) {
                                  console.error('Error inserting tags:', tagError);
                                }
                              }
                            }
                          }

                          successCount++;
                        } catch (error) {
                          console.error('Error creating item:', error);
                          errorCount++;
                        }
                      }

                      if (successCount > 0) {
                        toast({
                          title: t("addItem.registrationComplete"),
                          description: `${successCount}${t("addItem.itemsRegistered")}${errorCount > 0 ? `（${errorCount}${t("addItem.itemsFailed")}）` : ''}`,
                        });
                        resetForm();
                      } else {
                        toast({
                          title: t("common.error"),
                          description: t("addItem.registrationError"),
                          variant: "destructive",
                        });
                      }
                    }}
                    onBack={() => {
                      setCurrentStep("step1");
                      setIsMultipleMode(false);
                      setSelectedImages([]);
                    }}
                  />
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h2 className="text-lg font-semibold mb-1">グッズ情報を入力</h2>
                      <p className="text-sm text-muted-foreground">
                        タイトルやコンテンツ名を入力してください
                      </p>
                    </div>

                    {/* プレビュー画像 */}
                    {previewUrl && (
                      <div className="flex justify-center mb-6">
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
                          <img 
                            src={previewUrl} 
                            alt="プレビュー" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    <ItemDetailsSection
                      formData={formData}
                      onUpdate={handleFormUpdate}
                    />

                    <div className="flex justify-between pt-4 border-t">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("step1")}
                        className="gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        戻る
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
                            追加中...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            グッズを追加
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
