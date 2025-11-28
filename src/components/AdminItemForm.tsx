
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageSection, type AnalysisResult } from "./admin-item-form/ImageSection";
import { ItemDetailsSection } from "./admin-item-form/ItemDetailsSection";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useItemDetails } from "@/hooks/admin-item-form/useItemDetails";
import { useItemSubmit } from "@/hooks/admin-item-form/useItemSubmit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminItemForm() {
  const [currentStep, setCurrentStep] = useState("step1");
  const [step1Completed, setStep1Completed] = useState(false);

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
                  // AI分析結果をフォームに自動入力
                  const updates: any = {};
                  
                  if (result.title) updates.title = result.title;
                  if (result.description) updates.description = result.description;
                  if (result.price) updates.price = result.price;
                  if (result.category) updates.category = result.category;
                  if (result.contentName) updates.content_name = result.contentName;
                  
                  handleFormUpdate(updates);
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
            </TabsContent>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
