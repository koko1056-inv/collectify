
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageSection } from "./admin-item-form/ImageSection";
import { ItemDetailsSection } from "./admin-item-form/ItemDetailsSection";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useItemDetails } from "@/hooks/admin-item-form/useItemDetails";
import { useItemSubmit } from "@/hooks/admin-item-form/useItemSubmit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function AdminItemForm() {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規アイテムの追加</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-100">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700 text-sm">
            あなたが追加したグッズは、他のユーザーがコレクションに追加できるようになります。
            コミュニティの成長にご協力ください！
          </AlertDescription>
        </Alert>

        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <ImageSection
            imageFile={imageFile}
            setImageFile={setImageFile}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
          />

          <ItemDetailsSection
            formData={formData}
            onUpdate={handleFormUpdate}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "追加中..." : "アイテムを追加"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
