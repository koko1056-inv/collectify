import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag } from "@/types";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  });

  const getDisplayText = () => {
    if (selectedTags.length === 0) return "タグから選択";
    if (selectedTags.length === 1) return selectedTags[0];
    return `${selectedTags.length}個のタグを選択中`;
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleTagToggle = async (tagName: string) => {
    try {
      if (selectedTags.includes(tagName)) {
        onTagsChange(selectedTags.filter(tag => tag !== tagName));
      } else {
        onTagsChange([...selectedTags, tagName]);
      }
      
      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await queryClient.invalidateQueries({ queryKey: ["user-item-tags"] });
      
      toast({
        title: selectedTags.includes(tagName) ? "タグを削除しました" : "タグを追加しました",
        description: `${tagName}を${selectedTags.includes(tagName) ? "削除" : "追加"}しました。`,
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error toggling tag:", error);
      toast({
        title: "エラー",
        description: "タグの更新に失敗しました。",
        variant: "destructive",
      });
    }
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