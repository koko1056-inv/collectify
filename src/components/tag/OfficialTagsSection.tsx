
import { Badge } from "@/components/ui/badge";
import { SimpleItemTag } from "@/utils/tag/types";

interface OfficialTagsSectionProps {
  officialTags: SimpleItemTag[];
}

export function OfficialTagsSection({ officialTags }: OfficialTagsSectionProps) {
  if (officialTags.length === 0) return null;

  const tagsByCategory = {
    character: officialTags.filter(tag => tag.tags?.category === 'character'),
    type: officialTags.filter(tag => tag.tags?.category === 'type'),
    series: officialTags.filter(tag => tag.tags?.category === 'series'),
  };

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">公式アイテムのタグ:</h3>
      <div className="space-y-1">
        {Object.entries(tagsByCategory).map(([category, tags]) => 
          tags.length > 0 && (
            <div key={category} className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {category === 'character' ? 'キャラ:' : 
                 category === 'type' ? 'タイプ:' : 
                 category === 'series' ? 'シリーズ:' : ''}
              </span>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, idx) => (
                  tag.tags && (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag.tags.name}
                    </Badge>
                  )
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
