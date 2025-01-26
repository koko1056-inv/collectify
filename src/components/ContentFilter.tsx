import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContentFilterProps {
  selectedContent: string[];
  onContentChange: (content: string[]) => void;
}

export function ContentFilter({ selectedContent, onContentChange }: ContentFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contents = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .eq('type', 'content')
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const getDisplayText = () => {
    if (selectedContent.length === 0) return "コンテンツから選択";
    if (selectedContent.length === 1) return selectedContent[0];
    return `${selectedContent.length}個のコンテンツを選択中`;
  };

  const filteredContents = contents.filter(content =>
    content.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTextSize = (text: string) => {
    if (text.length > 15) return 'text-xs';
    if (text.length > 10) return 'text-sm';
    return 'text-base';
  };

  const handleContentToggle = (contentName: string) => {
    if (selectedContent.includes(contentName)) {
      onContentChange(selectedContent.filter(content => content !== contentName));
    } else {
      onContentChange([...selectedContent, contentName]);
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
              コンテンツを選択
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pb-0">
            <Input
              placeholder="コンテンツを検索..."
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
                  variant={selectedContent.length === 0 ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={() => {
                    onContentChange([]);
                    setIsDialogOpen(false);
                  }}
                >
                  <span className="text-base">すべて</span>
                </Button>
              )}
              {filteredContents.map((content) => (
                <Button
                  key={content.id}
                  variant={selectedContent.includes(content.name) ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2 px-2"
                  onClick={() => {
                    handleContentToggle(content.name);
                  }}
                >
                  <span className={`${getTextSize(content.name)} break-words text-center w-full`}>
                    {content.name}
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