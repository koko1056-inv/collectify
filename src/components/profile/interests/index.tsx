
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Heart, Plus } from "lucide-react";
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
          <h3 className="text-[13px] font-bold tracking-wide">推しコンテンツ</h3>
          {selectedInterests.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {selectedInterests.length}件
            </span>
          )}
        </div>
        <button
          onClick={() => setIsSelectingContent(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> 編集
        </button>
      </div>

      {selectedInterests.length === 0 ? (
        <button
          onClick={() => setIsSelectingContent(true)}
          className="w-full rounded-2xl border border-dashed border-border bg-muted/40 hover:bg-muted/60 transition-colors py-5 flex flex-col items-center justify-center gap-1.5 text-muted-foreground"
        >
          <Heart className="w-5 h-5 opacity-50" />
          <span className="text-xs font-medium">推しコンテンツを追加</span>
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <InterestsList
            interests={selectedInterests}
            onRemove={handleToggleContent}
          />
          <button
            onClick={() => setIsSelectingContent(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="w-3 h-3" /> 追加
          </button>
        </div>
      )}

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
