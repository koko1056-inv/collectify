import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagInput({ selectedTags, onTagsChange }: TagInputProps) {
  const [tagInput, setTagInput] = useState("");
  const [open, setOpen] = useState(false);

  const { data: existingTags = [] } = useQuery({
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

  const filteredTags = existingTags?.filter(tag => 
    tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
    !selectedTags.includes(tag.name)
  ) || [];

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!selectedTags.includes(newTag)) {
        onTagsChange([...selectedTags, newTag]);
      }
      setTagInput("");
      setOpen(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleSelectTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      onTagsChange([...selectedTags, tagName]);
    }
    setTagInput("");
    setOpen(false);
  };

  useEffect(() => {
    if (tagInput.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [tagInput]);

  return (
    <div className="space-y-2">
      <label htmlFor="tags" className="text-sm font-medium">
        タグ
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="タグを入力してEnterを押してください"
              className="w-full"
            />
          </div>
        </PopoverTrigger>
        {filteredTags.length > 0 && (
          <PopoverContent className="p-0" align="start">
            <Command>
              <CommandGroup>
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleSelectTag(tag.name)}
                    className="cursor-pointer"
                  >
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        )}
      </Popover>
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {existingTags.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-1">既存のタグ:</p>
          <div className="flex flex-wrap gap-2">
            {existingTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="cursor-pointer hover:bg-secondary"
                onClick={() => {
                  if (!selectedTags.includes(tag.name)) {
                    onTagsChange([...selectedTags, tag.name]);
                  }
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}