
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageSection, type AnalysisResult } from "./admin-item-form/ImageSection";
import { ItemDetailsSection } from "./admin-item-form/ItemDetailsSection";
import { MultipleItemsForm } from "./admin-item-form/MultipleItemsForm";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useItemDetails } from "@/hooks/admin-item-form/useItemDetails";
import { useItemSubmit } from "@/hooks/admin-item-form/useItemSubmit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function AdminItemForm() {
  const [currentStep, setCurrentStep] = useState("step1");
  const [step1Completed, setStep1Completed] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; title: string | null }>>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const { toast } = useToast();

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

  // フォームのリセット状態を管理するためのkey
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
    // フォーム全体を再レンダリング
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
    <Card>
      <CardHeader>
        <CardTitle>新規アイテムの追加</CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Alert className="mb-4 bg-blue-50 border-blue-100">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700 text-sm">
            あなたが追加したグッズは、他のユーザーがコレクションに追加できるようになります。
            コミュニティの成長にご協力ください！
          </AlertDescription>
        </Alert>

        <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TabsTrigger 
              value="step1" 
              className={cn(
                "relative flex items-center justify-center gap-2",
                step1Completed && "text-green-600"
              )}
            >
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                step1Completed ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
              )}>
                {step1Completed ? <Check className="w-4 h-4" /> : "1"}
              </span>
              <span>画像の追加</span>
            </TabsTrigger>
            
            <ChevronRight className={cn(
              "w-5 h-5 flex-shrink-0",
              step1Completed ? "text-primary" : "text-muted-foreground"
            )} />
            
            <TabsTrigger 
              value="step2" 
              disabled={!step1Completed}
              className={cn(
                "relative flex items-center justify-center gap-2",
                !step1Completed && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                step1Completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                2
              </span>
              <span>詳細の追加</span>
            </TabsTrigger>
          </TabsList>

          <form key={formKey} onSubmit={handleSubmit} className="mt-6">
            <TabsContent value="step1" className="space-y-4">
              <ImageSection
                imageFile={imageFile}
                setImageFile={handleImageChange}
                previewUrl={previewUrl}
                setPreviewUrl={setPreviewUrl}
                onAnalysisComplete={(result) => {
                  // 複数画像が選択された場合の処理
                  if (result.selectedImages && result.selectedImages.length > 0) {
                    setSelectedImages(result.selectedImages);
                    setIsMultipleMode(true);
                    setStep1Completed(true);
                    setCurrentStep("step2");
                    
                    toast({
                      title: "画像を選択しました",
                      description: `${result.selectedImages.length}件の画像が選択されました。各グッズの詳細を入力してください。`,
                    });
                  } else {
                    // 単一画像の場合はAI分析結果をフォームに自動入力
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
              
              <div className="flex justify-end">
                <Button 
                  type="button"
                  onClick={handleNextStep}
                  disabled={!canProceedToStep2}
                  className="px-8"
                >
                  次へ
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="space-y-4">
              {isMultipleMode ? (
                <MultipleItemsForm
                  images={selectedImages}
                  onSubmit={async (items) => {
                    const user = (await supabase.auth.getUser()).data.user;
                    if (!user) {
                      toast({
                        title: "エラー",
                        description: "ログインが必要です。",
                        variant: "destructive",
                      });
                      return;
                    }

                    let successCount = 0;
                    let errorCount = 0;

                    for (const item of items) {
                      try {
                        // 画像をアップロード
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

                        // アイテムを登録
                        const { error: insertError } = await supabase
                          .from('official_items')
                          .insert({
                            title: item.title,
                            description: item.description || null,
                            image: publicUrl,
                            price: item.price,
                            content_name: item.content_name || null,
                            created_by: user.id,
                            release_date: new Date().toISOString(),
                            item_type: 'official',
                          });

                        if (insertError) throw insertError;
                        successCount++;
                      } catch (error) {
                        console.error('Error creating item:', error);
                        errorCount++;
                      }
                    }

                    if (successCount > 0) {
                      toast({
                        title: "登録完了",
                        description: `${successCount}件のグッズを登録しました${errorCount > 0 ? `（${errorCount}件失敗）` : ''}。`,
                      });
                      resetForm();
                    } else {
                      toast({
                        title: "エラー",
                        description: "グッズの登録に失敗しました。",
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
                  <ItemDetailsSection
                    formData={formData}
                    onUpdate={handleFormUpdate}
                  />

                  <div className="flex justify-between">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep("step1")}
                    >
                      戻る
                    </Button>
                    <Button type="submit" disabled={loading} className="px-8">
                      {loading ? "追加中..." : "アイテムを追加"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
