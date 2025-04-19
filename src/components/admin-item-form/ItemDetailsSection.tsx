
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContentSection } from "./sections/ContentSection";
import { TagsSection } from "./sections/TagsSection";
import { TitleSection } from "./sections/TitleSection";
import { MerchandiseCategorySection } from "./sections/MerchandiseCategorySection";

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
    <div className="space-y-4">
      <TitleSection  // タイトルセクションをカテゴリの前に移動
        title={formData.title}
        onChange={handleChange}
      />

      <MerchandiseCategorySection
        value={formData.category}
        onChange={handleCategoryChange}
      />

      <ContentSection
        contentName={formData.content_name || ""}
        onChange={handleChange}
      />

      <TagsSection
        characterTag={formData.characterTag}
        typeTag={formData.typeTag}
        seriesTag={formData.seriesTag}
        onTagChange={handleTagChange}
      />

      <div className="space-y-2">
        <Label htmlFor="price">価格</Label>
        <Input
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder="価格を入力"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">自由メモ</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="グッズに関する自由なメモを入力してください"
        />
      </div>
    </div>
  );
}

