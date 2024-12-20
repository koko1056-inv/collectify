import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

interface TagInputProps {
  selectedTags: Tag[];
  onRemoveTag: (tag: Tag) => void;
  onAddTag: (tag: Tag) => void;
}

export function TagInput({ selectedTags, onRemoveTag, onAddTag }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const filteredTags = allTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.some((selectedTag) => selectedTag.id === tag.id)
  );

  const handleTagSelect = async (tag: Tag) => {
    onAddTag(tag);
    setInputValue("");
    setShowSuggestions(false);
  };

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
      <div className="relative">
        <Input
          type="text"
          placeholder="タグを入力..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding suggestions to allow click events to fire
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className="mt-2"
        />
        {showSuggestions && inputValue && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleTagSelect(tag)}
              >
                {tag.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}