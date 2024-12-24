import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag } from "@/types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface InitialInterestSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
}

export function InitialInterestSelection({
  isOpen,
  onClose,
  tags,
}: InitialInterestSelectionProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleConfirm = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ interests: selectedTags })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "興味のあるタグを保存しました",
        description: "おすすめのアイテムが表示されます",
      });
      onClose();
    } catch (error) {
      console.error('Error saving interests:', error);
      toast({
        title: "エラーが発生しました",
        description: "興味のあるタグの保存に失敗しました",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            興味のあるタグを選択してください
          </DialogTitle>
        </DialogHeader>
        <div className="text-center text-gray-600 mb-4">
          好みに合わせたグッズを表示するために、興味のあるタグを選んでください
        </div>
        <ScrollArea className="h-[50vh] pr-4">
          <div className="grid grid-cols-2 gap-2 p-4">
            {tags.map((tag) => (
              <Button
                key={tag.id}
                variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => handleTagToggle(tag.name)}
              >
                <span className="text-base break-words text-center w-full">
                  {tag.name}
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