
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageSection } from "./admin-item-form/ImageSection";
import { ItemDetailsSection } from "./admin-item-form/ItemDetailsSection";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useItemDetails } from "@/hooks/admin-item-form/useItemDetails";
import { useSubmitItem } from "@/hooks/admin-item-form/useSubmitItem";

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
      content_name: null,
    });
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedTags([]);
  };

  const { loading, handleSubmit } = useSubmitItem({
    formData,
    uploadImage,
    selectedTags,
    resetForm,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規アイテムの提案</CardTitle>
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
            {loading ? "送信中..." : "アイテムを提案"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
