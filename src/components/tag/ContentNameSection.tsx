
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface ContentNameSectionProps {
  contentName: string | null;
  onContentChange: (contentName: string | null) => void;
}

export function ContentNameSection({ contentName, onContentChange }: ContentNameSectionProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");

  const { data: contentNames = [], isLoading: isContentLoading } = useQuery({
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

  const handleContentChange = (value: string) => {
    console.log(`ContentNameSection: Selected value: ${value}`);
    if (value === "other") {
      setIsAddingNewContent(true);
      onContentChange(null);
    } else if (value === "none") {
      onContentChange(null);
    } else {
      onContentChange(value);
    }
  };

  const handleAddNewContent = async () => {
    if (!newContentName.trim()) {
      toast({
        title: t("tagManage.common.error"),
        description: t("tagManage.content.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("content_names")
        .insert([{ name: newContentName, type: "other" }])
        .select()
        .single();
      
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ["content-names"] });
      
      onContentChange(data.name);
      
      setIsAddingNewContent(false);
      setNewContentName("");
      
      toast({
        title: t("tagManage.content.added"),
        description: `${t("tagManage.common.addedPrefix")}${data.name}${t("tagManage.common.addedSuffix")}`,
      });
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        title: t("tagManage.common.error"),
        description: t("tagManage.content.addFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{t("tagManage.content.heading")}</h3>
      
      {isAddingNewContent ? (
        <div className="flex gap-2">
          <Input
            value={newContentName}
            onChange={(e) => setNewContentName(e.target.value)}
            placeholder={t("tagManage.content.newPlaceholder")}
            className="flex-1"
          />
          <Button onClick={handleAddNewContent}>
            {t("tagManage.common.add")}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsAddingNewContent(false);
              setNewContentName("");
            }}
          >
            {t("tagManage.common.cancel")}
          </Button>
        </div>
      ) : (
        isContentLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("tagManage.common.loading")}</span>
          </div>
        ) : (
          <Select
            value={contentName || "none"}
            onValueChange={handleContentChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("tagManage.content.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("tagManage.content.none")}</SelectItem>
              {contentNames.map((content) => (
                <SelectItem key={content.id} value={content.name}>
                  {content.name}
                </SelectItem>
              ))}
              <SelectItem value="other">{t("tagManage.content.other")}</SelectItem>
            </SelectContent>
          </Select>
        )
      )}
    </div>
  );
}
