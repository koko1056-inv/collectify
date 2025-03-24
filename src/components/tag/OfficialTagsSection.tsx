
import { Badge } from "@/components/ui/badge";
import { SimpleItemTag } from "@/utils/tag/types";

interface OfficialTagsSectionProps {
  officialTags: SimpleItemTag[];
}

export function OfficialTagsSection({ officialTags }: OfficialTagsSectionProps) {
  if (officialTags.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">公式アイテムのタグ:</h3>
      <div className="flex flex-wrap gap-2">
        {officialTags.map((tag) => (
          <Badge 
            key={tag.tag_id} 
            variant="outline"
            className="text-xs"
          >
            {tag.tags.name}
            {tag.tags.category && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({tag.tags.category})
              </span>
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}
