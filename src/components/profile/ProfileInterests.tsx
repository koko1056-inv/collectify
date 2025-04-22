
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProfileInterestsProps {
  currentInterests: string[] | null;
  onUpdate: () => void;
}

export function ProfileInterests({ currentInterests = [], onUpdate }: ProfileInterestsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentInterests || []);
  const [saving, setSaving] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const queryClient = useQueryClient();

  const { data: contentNames = [], isLoading } = useQuery({
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
        .insert([{ name: newContentName, type: "other" }]);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["content-names"] });
      setNewContentName("");
      setIsAddingContent(false);
      
      toast({
        title: "コンテンツを追加しました",
        description: `${newContentName}を追加しました`,
      });
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">推しコンテンツ</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setIsAddingContent(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {contentNames.map((content) => (
          <Button
            key={content.id}
            variant={selectedInterests.includes(content.name) ? "default" : "outline"}
            className="h-auto py-1.5 px-2 text-xs"
            onClick={() => handleToggleContent(content.name)}
          >
            {content.name}
          </Button>
        ))}
      </div>

      <Button 
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? "保存中..." : "保存する"}
      </Button>

      <Dialog open={isAddingContent} onOpenChange={setIsAddingContent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいコンテンツを追加</DialogTitle>
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
