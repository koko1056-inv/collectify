
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getAllContentNames } from "@/utils/tag/content-operations";
import { InterestsList } from "./InterestsList";
import { ContentSelectionDialog } from "./ContentSelectionDialog";
import { AddContentDialog } from "./AddContentDialog";
import { ContentNameType } from "./types";

interface ProfileInterestsProps {
  currentInterests: string[] | null;
  onUpdate: () => void;
}

export function ProfileInterests({ 
  currentInterests = [], 
  onUpdate 
}: ProfileInterestsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentInterests || []);
  const [saving, setSaving] = useState(false);
  const [isSelectingContent, setIsSelectingContent] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const queryClient = useQueryClient();

  const { data: contentNames = [], isLoading } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      try {
        const data = await getAllContentNames();
        return data as ContentNameType[];
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
      }
      return [...prev, contentName];
    });
  };

  const handleAddNewContent = async (newContentName: string) => {
    try {
      const { error } = await supabase
        .from("content_names")
        .insert([{ name: newContentName, type: "anime" }]);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["content-names"] });
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

      <InterestsList
        interests={selectedInterests}
        onRemove={handleToggleContent}
      />

      <ContentSelectionDialog
        isOpen={isSelectingContent}
        onClose={() => setIsSelectingContent(false)}
        selectedInterests={selectedInterests}
        onToggleContent={handleToggleContent}
        onSave={handleSave}
        contentNames={contentNames}
        onAddNew={() => setIsAddingContent(true)}
      />

      <AddContentDialog
        isOpen={isAddingContent}
        onClose={() => setIsAddingContent(false)}
        onAdd={handleAddNewContent}
      />
    </div>
  );
}
