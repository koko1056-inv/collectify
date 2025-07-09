import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleItemTag } from "@/utils/tag/types";

interface CurrentTagsListProps {
  currentTags: SimpleItemTag[];
  onRemoveTag?: (tagId: string) => void;
}

export function CurrentTagsList({ currentTags, onRemoveTag }: CurrentTagsListProps) {
  
  if (currentTags.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">現在タグは設定されていません</p>
        <p className="text-xs text-muted-foreground mt-1">下からタグを選択してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">現在のタグ</h3>
        <Badge variant="secondary" className="text-xs">
          {currentTags.length}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {currentTags.map((tag) => {
          const tagName = tag.tags?.name || tag.tag_id || 'タグ名なし';
          
          return (
            <Badge 
              key={tag.tag_id || tag.id} 
              variant="default" 
              className="group bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm font-medium"
            >
              <span>{tagName}</span>
              {onRemoveTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1.5 -mr-1 hover:bg-transparent group-hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveTag(tag.tag_id || tag.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}