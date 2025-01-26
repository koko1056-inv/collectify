import { Input } from "@/components/ui/input";
import { TagInput } from "../TagInput";
import { ContentNameSelect } from "./ContentNameSelect";

interface ItemDetailsSectionProps {
  formData: {
    title: string;
    description: string;
    anime: string;
    artist: string;
  };
  setFormData: (data: any) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export function ItemDetailsSection({
  formData,
  setFormData,
  selectedTags,
  setSelectedTags,
}: ItemDetailsSectionProps) {
  const handleContentChange = (type: "anime" | "artist", value: string) => {
    if (value === "other") {
      return;
    }
    setFormData({ ...formData, [type]: value });
  };

  return (
    <>
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

      <ContentNameSelect
        type="anime"
        value={formData.anime}
        onChange={(value) => handleContentChange("anime", value)}
        label="アニメ"
      />

      <ContentNameSelect
        type="artist"
        value={formData.artist}
        onChange={(value) => handleContentChange("artist", value)}
        label="アーティスト"
      />

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
    </>
  );
}