
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContentSection } from "./sections/ContentSection";
import { TagsSection } from "./sections/TagsSection";
import { TitleSection } from "./sections/TitleSection";
import { MerchandiseCategorySection } from "./sections/MerchandiseCategorySection";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface FormData {
  title: string;
  description: string;
  category: string;
  content_name?: string | null;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
  price: string;
}

interface ItemDetailsSectionProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export function ItemDetailsSection({
  formData,
  setFormData,
  selectedTags,
  setSelectedTags,
}: ItemDetailsSectionProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryChange = (category: string) => {
    setFormData({ ...formData, category });
  };

  const handleTagChange = (category: string, value: string | null) => {
    setFormData({ 
      ...formData, 
      [`${category}Tag`]: value
    });
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-6">
          <TitleSection
            title={formData.title}
            onChange={handleChange}
          />

          <Separator className="my-4" />

          <MerchandiseCategorySection
            value={formData.category}
            onChange={handleCategoryChange}
          />

          <Separator className="my-4" />

          <ContentSection
            contentName={formData.content_name || ""}
            onChange={handleChange}
          />

          <Separator className="my-4" />

          <TagsSection
            characterTag={formData.characterTag}
            typeTag={formData.typeTag}
            seriesTag={formData.seriesTag}
            onTagChange={handleTagChange}
          />

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium">価格</Label>
            <div className="relative">
              <Input
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="価格を入力"
                className="pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">自由メモ</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="グッズに関する自由なメモを入力してください"
              className="resize-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
