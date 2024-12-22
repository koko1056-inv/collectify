import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "./TagInput";
import { ImageUpload } from "./ImageUpload";
import { useAdminItemForm } from "@/hooks/useAdminItemForm";

export function AdminItemForm() {
  const {
    formData,
    setFormData,
    imageFile,
    setImageFile,
    previewUrl,
    setPreviewUrl,
    selectedTags,
    setSelectedTags,
    loading,
    handleSubmit,
  } = useAdminItemForm();

  const handleImageChange = (file: File | null) => {
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規アイテムの追加</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUpload
            onImageChange={handleImageChange}
            previewUrl={previewUrl}
          />
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              タイトル
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              説明
            </label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <TagInput
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "追加中..." : "アイテムを追加"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}