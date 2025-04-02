
import { Badge } from "@/components/ui/badge";
import { SimpleItemTag } from "@/utils/tag/types";

interface OfficialTagsSectionProps {
  officialTags: SimpleItemTag[];
  selectedTags: string[];
  onSelectTag: (tagId: string) => void;
  onUnselectTag: (tagId: string) => void;
}

export function OfficialTagsSection({
  officialTags,
  selectedTags,
  onSelectTag,
  onUnselectTag
}: OfficialTagsSectionProps) {
  if (!officialTags || officialTags.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        このアイテムには公式タグがありません。
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm text-gray-500">
          以下の公式タグが利用可能です。クリックして選択できます。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {officialTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.tag_id);
          return (
            <Badge
              key={tag.tag_id}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                if (isSelected) {
                  onUnselectTag(tag.tag_id);
                } else {
                  onSelectTag(tag.tag_id);
                }
              }}
            >
              {tag.tags.name}
              {tag.tags.category && (
                <span className="ml-1 text-xs opacity-70">
                  ({tag.tags.category})
                </span>
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
