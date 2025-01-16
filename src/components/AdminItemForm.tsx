import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageSection } from "./admin-item-form/ImageSection";
import { ItemDetailsSection } from "./admin-item-form/ItemDetailsSection";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useItemDetails } from "@/hooks/admin-item-form/useItemDetails";
import { useItemSubmit } from "@/hooks/admin-item-form/useItemSubmit";

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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
    });
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedTags([]);
  };

  const { loading, handleSubmit } = useItemSubmit({
    formData,
    uploadImage,
    selectedTags,
    resetForm,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規公式アイテムの追加</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageSection
            imageFile={imageFile}
            setImageFile={setImageFile}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
          />

          <ItemDetailsSection
            formData={formData}
            setFormData={setFormData}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "追加中..." : "アイテムを追加"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}