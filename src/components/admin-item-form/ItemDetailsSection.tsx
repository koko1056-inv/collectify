import { Input } from "@/components/ui/input";
import { TagInput } from "../TagInput";

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
        <label htmlFor="anime" className="text-sm font-medium">
          アニメ
        </label>
        <Input
          id="anime"
          value={formData.anime}
          onChange={(e) =>
            setFormData({ ...formData, anime: e.target.value })
          }
          placeholder="アニメタイトルを入力"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="artist" className="text-sm font-medium">
          アーティスト
        </label>
        <Input
          id="artist"
          value={formData.artist}
          onChange={(e) =>
            setFormData({ ...formData, artist: e.target.value })
          }
          placeholder="アーティスト名を入力"
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