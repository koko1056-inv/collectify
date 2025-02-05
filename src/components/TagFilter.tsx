import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag } from "@/types";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const getDisplayText = () => {
    if (selectedTags.length === 0) return "タグから選択";
    if (selectedTags.length === 1) return selectedTags[0];
    return `${selectedTags.length}個のタグを選択中`;
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get top 5 most used tags
  const popularTags = tags.slice(0, 5);

  const getTextSize = (text: string) => {
    if (text.length > 15) return 'text-xs';
    if (text.length > 10) return 'text-sm';
    return 'text-base';
  };

  React.useEffect(() => {
    const validTags = selectedTags.filter(tag => tags.some(t => t.name === tag));
    if (validTags.length !== selectedTags.length) {
      onTagsChange(validTags);
    }
  }, [tags, selectedTags, onTagsChange]);

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="w-full justify-between font-normal text-xs h-8"
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>

      <div className="relative w-full">
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-2">
            <Button
              key="all"
              variant={selectedTags.length === 0 ? "default" : "outline"}
              size="sm"
              className="text-xs h-6 px-2 shrink-0"
              onClick={() => onTagsChange([])}
            >
              すべて
            </Button>
            {popularTags.map((tag) => (
              <Button
                key={tag.id}
                variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                size="sm"
                className="text-xs h-6 px-2 shrink-0"
                onClick={() => handleTagToggle(tag.name)}
              >
                {tag.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              タグを選択
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pb-0">
            <Input
              placeholder="タグを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          </div>
          <ScrollArea className="h-[50vh] pr-4">
            <div className="grid grid-cols-2 gap-2 p-4">
              {searchQuery === "" && (
                <Button
                  key="all"
                  variant={selectedTags.length === 0 ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={() => {
                    onTagsChange([]);
                    setIsDialogOpen(false);
                  }}
                >
                  <span className="text-base">すべて</span>
                </Button>
              )}
              {filteredTags.map((tag) => (
                <Button
                  key={tag.id}
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2 px-2"
                  onClick={() => handleTagToggle(tag.name)}
                >
                  <span className={`${getTextSize(tag.name)} break-words text-center w-full`}>
                    {tag.name}
                  </span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}