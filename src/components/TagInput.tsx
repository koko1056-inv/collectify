import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useState } from "react";

interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

interface TagInputProps {
  selectedTags: Tag[];
  onRemoveTag: (tag: Tag) => void;
}

export function TagInput({ selectedTags, onRemoveTag }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {tag.name}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => onRemoveTag(tag)}
            />
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        placeholder="タグを入力..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="mt-2"
      />
    </div>
  );
}