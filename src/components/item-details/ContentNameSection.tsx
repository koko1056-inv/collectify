import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSuggestNames } from "@/hooks/useSuggestNames";
import { DidYouMean } from "@/components/search/DidYouMean";

interface ContentNameSectionProps {
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  contentName: string | null | undefined;
}

export function ContentNameSection({
  isEditing,
  editedData,
  setEditedData,
  contentName,
}: ContentNameSectionProps) {
  const [isAddingNewContent, setIsAddingNewContent] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  // 新しい作品名を入れているとき、近い既存の作品を「もしかして」で出す（表記ゆれ・英語名・別名・打ち間違いの重複登録を防ぐ）
  const { suggestions: contentSuggestions } = useSuggestNames(isAddingNewContent ? newContentName : "", "content", 4);

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

  const addContentMutation = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from("content_names")
        .insert([{ 
          name, 
          type: "anime"
        }])
        .select()
        .single();
      
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["content-names"] });
      setEditedData({ ...editedData, content_name: data.name });
      setIsAddingNewContent(false);
      setNewContentName("");

      toast.success(t("itemDetails.contentSection.added"), {
        description: t("itemDetails.contentSection.addedDescription", { name: data.name }),
      });
    } catch (error) {
      console.error("Error adding content:", error);
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.contentSection.addFailed"),
      });
    }
  };

  const handleContentChange = (value: string) => {
    if (value === "other") {
      setIsAddingNewContent(true);
      setEditedData({ ...editedData, content_name: null });
    } else if (value === "none") {
      setEditedData({ ...editedData, content_name: null });
    } else {
      setEditedData({ ...editedData, content_name: value });
    }
  };

  const handleItemTypeChange = (value: string) => {
    setEditedData({ ...editedData, item_type: value });
  };

  // 編集モードでない場合はItemDetailInfoで表示されるためここでは表示しない

  if (!isEditing) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t("itemDetails.common.content")}
        </label>
        {isAddingNewContent ? (
          <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newContentName}
              onChange={(e) => setNewContentName(e.target.value)}
              placeholder={t("itemDetails.contentSection.newContentPlaceholder")}
            />
            <Button
              onClick={() => addContentMutation(newContentName)}
            >
              {t("itemDetails.common.add")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingNewContent(false);
                setNewContentName("");
              }}
            >
              {t("itemDetails.common.cancel")}
            </Button>
          </div>
          <DidYouMean
            options={contentSuggestions.map((x) => ({ key: x.name, label: x.name, hint: x.matched !== x.name ? x.matched : undefined }))}
            onPick={(name) => {
              setEditedData({ ...editedData, content_name: name });
              setIsAddingNewContent(false);
              setNewContentName("");
            }}
          />
          </div>
        ) : (
          <Select
            value={editedData.content_name || "none"}
            onValueChange={handleContentChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("itemDetails.contentSection.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("itemDetails.contentSection.none")}</SelectItem>
              {contentNames.map((content) => (
                <SelectItem key={content.id} value={content.name}>
                  {content.name}
                </SelectItem>
              ))}
              <SelectItem value="other">{t("itemDetails.contentSection.other")}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 商品タイプは公式アイテムのみ編集可 */}
      {"item_type" in editedData && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("itemDetails.contentSection.itemTypeLabel")}
          </label>
          <Select
            value={editedData.item_type || "official"}
            onValueChange={handleItemTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("itemDetails.contentSection.itemTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="official">{t("itemDetails.contentSection.official")}</SelectItem>
              <SelectItem value="original">{t("itemDetails.contentSection.original")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
