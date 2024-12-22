import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag } from "@/types";
import { Input } from "@/components/ui/input";

interface TagFilterProps {
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  tags: Tag[];
}

export function TagFilter({ selectedTag, onTagSelect, tags }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getDisplayText = () => {
    if (!selectedTag) return "タグから選択";
    return selectedTag;
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Function to determine text size based on string length
  const getTextSize = (text: string) => {
    if (text.length > 15) return 'text-xs';
    if (text.length > 10) return 'text-sm';
    return 'text-base';
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="w-full justify-between font-normal"
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

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
                  variant={selectedTag === null ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={() => {
                    onTagSelect(null);
                    setIsDialogOpen(false);
                  }}
                >
                  <span className="text-base">すべて</span>
                </Button>
              )}
              {filteredTags.map((tag) => (
                <Button
                  key={tag.id}
                  variant={selectedTag === tag.name ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2 px-2"
                  onClick={() => {
                    onTagSelect(tag.name);
                    setIsDialogOpen(false);
                  }}
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