
import { CategoryTagSelect } from "../../tag/CategoryTagSelect";

interface TagsSectionProps {
  characterTag: string | null;
  typeTag: string | null;
  seriesTag: string | null;
  onTagChange: (category: string, value: string | null) => void;
}

export function TagsSection({
  characterTag,
  typeTag,
  seriesTag,
  onTagChange,
}: TagsSectionProps) {
  return (
    <div className="space-y-4">
      <CategoryTagSelect
        category="character"
        label="キャラクター・人物名"
        value={characterTag}
        onChange={(value) => onTagChange('character', value)}
      />

      <CategoryTagSelect
        category="type"
        label="グッズタイプ"
        value={typeTag}
        onChange={(value) => onTagChange('type', value)}
      />

      <CategoryTagSelect
        category="series"
        label="グッズシリーズ"
        value={seriesTag}
        onChange={(value) => onTagChange('series', value)}
      />
    </div>
  );
}
