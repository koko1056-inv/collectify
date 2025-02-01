import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Tag } from "@/types";

interface CurrentTagsProps {
  selectedTags: string[];
  onRemoveTag: (tag: string) => void;
  tags: Tag[];
}

export function CurrentTags({ selectedTags, onRemoveTag, tags }: CurrentTagsProps) {
  if (selectedTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {selectedTags.map((tagName) => {
        const tag = tags.find((t) => t.name === tagName);
        if (!tag) return null;

        return (
          <Badge
            key={tag.id}
            variant="secondary"
            className="pl-2 pr-1 py-1 flex items-center gap-1"
          >
            {tag.name}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveTag(tag.name);
              }}
              className="hover:bg-gray-200 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}