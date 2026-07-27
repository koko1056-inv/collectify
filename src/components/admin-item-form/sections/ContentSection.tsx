
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface ContentSectionProps {
  contentName: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function ContentSection({
  contentName,
  onChange,
}: ContentSectionProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");

  // contentNameがリセットされたときに内部状態をリセット
  useEffect(() => {
    if (!contentName) {
      setIsAddingNewContent(false);
      setNewContentName("");
    }
  }, [contentName]);

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

  const addContentMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("content_names")
        .insert([{ name, type: "anime" }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-names"] });
      const changeEvent = {
        target: { name: 'content_name', value: data.name }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(changeEvent);
      setIsAddingNewContent(false);
      setNewContentName("");
      toast({
        title: t("misc.itemForm.contentAddedTitle"),
        description: t("misc.itemForm.contentAddedDesc", { name: data.name }),
      });
    },
    onError: (error) => {
      toast({
        title: t("misc.common.error"),
        description: t("misc.itemForm.contentAddFailed"),
        variant: "destructive",
      });
      console.error("Error adding content:", error);
    },
  });

  const handleContentChange = (value: string) => {
    if (value === "other") {
      setIsAddingNewContent(true);
      const changeEvent = {
        target: { name: 'content_name', value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(changeEvent);
    } else if (value === "none") {
      const changeEvent = {
        target: { name: 'content_name', value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(changeEvent);
    } else {
      const changeEvent = {
        target: { name: 'content_name', value }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(changeEvent);
    }
  };

  const handleAddNewContent = () => {
    if (!newContentName.trim()) {
      toast({
        title: t("misc.common.error"),
        description: t("misc.itemForm.contentNameRequired"),
        variant: "destructive",
      });
      return;
    }
    addContentMutation.mutate(newContentName);
  };

  return (
    <div className="space-y-2">
      <Label>{t("misc.itemForm.contentLabel")}</Label>
      {isAddingNewContent ? (
        <div className="flex gap-2">
          <Input
            value={newContentName}
            onChange={(e) => setNewContentName(e.target.value)}
            placeholder={t("misc.itemForm.newContentPlaceholder")}
          />
          <Button 
            onClick={handleAddNewContent}
            disabled={addContentMutation.isPending}
          >
            {addContentMutation.isPending ? t("misc.itemForm.adding") : t("misc.common.add")}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsAddingNewContent(false);
              setNewContentName("");
            }}
          >
            {t("misc.common.cancel")}
          </Button>
        </div>
      ) : (
        <Select
          value={contentName || "none"}
          onValueChange={handleContentChange}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={t("misc.itemForm.contentPlaceholder")} />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="none" className="hover:bg-gray-100">{t("misc.itemForm.contentNone")}</SelectItem>
            {contentNames.map((content) => (
              <SelectItem 
                key={content.id} 
                value={content.name}
                className="hover:bg-gray-100"
              >
                {content.name}
              </SelectItem>
            ))}
            <SelectItem value="other" className="hover:bg-gray-100">{t("misc.itemForm.contentOther")}</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
