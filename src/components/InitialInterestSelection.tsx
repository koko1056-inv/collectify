
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface InitialInterestSelectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InitialInterestSelection({
  isOpen,
  onClose,
}: InitialInterestSelectionProps) {
  const [selectedContents, setSelectedContents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleContentToggle = (contentName: string) => {
    setSelectedContents(prev =>
      prev.includes(contentName)
        ? prev.filter(t => t !== contentName)
        : [...prev, contentName]
    );
  };

  const handleConfirm = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ favorite_contents: selectedContents })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "興味のあるコンテンツを保存しました",
        description: "おすすめのアイテムが表示されます",
      });
      onClose();
    } catch (error) {
      console.error('Error saving interests:', error);
      toast({
        title: "エラーが発生しました",
        description: "興味のあるコンテンツの保存に失敗しました",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredContents = contentNames.filter(content =>
    content.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            興味のあるコンテンツを選択してください
          </DialogTitle>
        </DialogHeader>
        <div className="text-center text-gray-600 mb-4">
          好みに合わせたグッズを表示するために、興味のあるコンテンツを選んでください
        </div>
        <div className="px-4">
          <Input
            placeholder="コンテンツを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
        </div>
        <ScrollArea className="h-[50vh] pr-4">
          <div className="flex flex-col gap-2 p-4">
            {filteredContents.map((content) => (
              <Button
                key={content.id}
                variant={selectedContents.includes(content.name) ? "default" : "outline"}
                className="w-full py-3 px-4 text-left justify-start"
                onClick={() => handleContentToggle(content.name)}
              >
                <span className="text-base">
                  {content.name}
                </span>
              </Button>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-center mt-4">
          <Button 
            onClick={handleConfirm} 
            className="w-full max-w-xs"
            disabled={saving}
          >
            {saving ? "保存中..." : "確定"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
