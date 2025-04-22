import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllContentNames } from "@/utils/tag/content-operations";

interface ProfileInterestsProps {
  currentInterests: string[] | null;
  onUpdate: () => void;
}

export function ProfileInterests({ currentInterests = [], onUpdate }: ProfileInterestsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentInterests || []);
  const [saving, setSaving] = useState(false);
  const [isSelectingContent, setIsSelectingContent] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const queryClient = useQueryClient();

  const { data: contentNames = [], isLoading } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      try {
        return await getAllContentNames();
      } catch (error) {
        console.error("Error fetching content names:", error);
        return [];
      }
    },
  });

  const handleToggleContent = (contentName: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(contentName)) {
        return prev.filter(name => name !== contentName);
      } else {
        return [...prev, contentName];
      }
    });
  };

  const handleAddNewContent = async () => {
    if (!newContentName.trim()) {
      toast({
        title: "エラー",
        description: "コンテンツ名を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("content_names")
        .insert([{ name: newContentName, type: "anime" }]);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["content-names"] });
      setNewContentName("");
      setIsAddingContent(false);
      
      toast({
        title: "コンテンツを追加しました",
        description: `${newContentName}を追加しました`,
      });

      setSelectedInterests(prev => [...prev, newContentName]);
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        title: "エラー",
        description: "コンテンツの追加に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ interests: selectedInterests })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "更新完了",
        description: "推しコンテンツを更新しました",
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating interests:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "推しコンテンツの更新に失敗しました",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pl-4">
        <h3 className="text-xl font-bold text-gray-800">推しコンテンツ</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setIsSelectingContent(true)}
        >
          選択する
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedInterests.map((interest) => (
          <div
            key={interest}
            className="bg-primary/5 text-primary flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
          >
            {interest}
            <button
              onClick={() => handleToggleContent(interest)}
              className="text-primary/50 hover:text-primary"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={isSelectingContent} onOpenChange={setIsSelectingContent}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>推しコンテンツを選択</DialogTitle>
            <DialogDescription>
              あなたの推しコンテンツを選んでください
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAddingContent(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              新規追加
            </Button>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 gap-2">
              {contentNames.map((content) => (
                <Button
                  key={content.id}
                  variant={selectedInterests.includes(content.name) ? "default" : "outline"}
                  className="w-full justify-center text-sm px-2 truncate max-w-full"
                  onClick={() => handleToggleContent(content.name)}
                >
                  {content.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsSelectingContent(false)}>
              キャンセル
            </Button>
            <Button onClick={() => {
              handleSave();
              setIsSelectingContent(false);
            }}>
              保存する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingContent} onOpenChange={setIsAddingContent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいコンテンツを追加</DialogTitle>
            <DialogDescription>
              推しコンテンツとして表示したい作品名などを追加できます
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newContentName}
              onChange={(e) => setNewContentName(e.target.value)}
              placeholder="コンテンツ名を入力"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddingContent(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddNewContent}>
                追加する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
