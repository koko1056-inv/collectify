
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TagDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredTags: any[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onClearTags: () => void;
}

export function TagDialog({
  isOpen,
  onOpenChange,
  searchQuery,
  onSearchChange,
  filteredTags,
  selectedTags,
  onTagSelect,
  onClearTags,
}: TagDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: categorizedTags = {} } = useQuery({
    queryKey: ["categorized-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;

      return data.reduce((acc: { [key: string]: any[] }, tag) => {
        const category = tag.category || "other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(tag);
        return acc;
      }, {});
    },
  });

  const categoryLabels: { [key: string]: string } = {
    all: "すべて",
    type: "グッズタイプ",
    character: "キャラクター・人物名",
    series: "グッズシリーズ",
    other: "その他",
  };

  const getFilteredTags = () => {
    if (selectedCategory === "all") {
      return filteredTags;
    }
    return filteredTags.filter(tag => tag.category === selectedCategory);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="mb-4"
          />
          <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full mb-4 h-auto flex-wrap gap-2 bg-transparent">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    selectedCategory === key
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={selectedCategory}>
              <ScrollArea className="h-[50vh]">
                <div className="grid grid-cols-2 gap-2 p-4">
                  {getFilteredTags().map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                      className="h-auto min-h-[5rem] px-2 py-4 flex flex-col items-center justify-center gap-2"
                      onClick={() => onTagSelect(tag.name)}
                    >
                      <span className="text-xs break-words text-center w-full line-clamp-2">
                        {tag.name}
                      </span>
                      {tag.category && (
                        <span className="text-[10px] text-gray-500">
                          {categoryLabels[tag.category] || tag.category}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        {selectedTags.length > 0 && (
          <div className="p-4 pt-0">
            <Button
              variant="outline"
              onClick={onClearTags}
              className="w-full"
            >
              選択をクリア
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
