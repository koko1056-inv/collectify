import { Input } from "@/components/ui/input";
import { TagInput } from "../TagInput";

interface ItemDetailsSectionProps {
  formData: {
    title: string;
    description: string;
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