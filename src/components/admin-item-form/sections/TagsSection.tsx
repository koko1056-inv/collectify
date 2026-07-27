
import { CategoryTagSelect } from "../../tag/CategoryTagSelect";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface TagsSectionProps {
  characterTag: string | null;
  typeTag: string | null;
  seriesTag: string | null;
  contentName: string | null;
  onTagChange: (category: string, value: string | null, tagId?: string | null) => void;
}

export function TagsSection({
  characterTag,
  typeTag,
  seriesTag,
  contentName,
  onTagChange,
}: TagsSectionProps) {
  const { t } = useLanguage();

  // コンテンツ名からコンテンツIDを取得
  const { data: contentData } = useQuery({
    queryKey: ["content-by-name", contentName],
    queryFn: async () => {
      if (!contentName) return null;
      
      const { data, error } = await supabase
        .from("content_names")
        .select("id, name")
        .eq("name", contentName)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching content:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!contentName,
  });

  const contentId = contentData?.id || null;

  return (
    <div className="space-y-4">
      <CategoryTagSelect
        category="character"
        label={t("misc.itemForm.tagCharacterLabel")}
        value={characterTag}
        onChange={(value, tagId) => onTagChange('character', value, tagId)}
        contentId={contentId}
        disabled={!contentName}
      />

      <CategoryTagSelect
        category="type"
        label={t("misc.itemForm.tagTypeLabel")}
        value={typeTag}
        onChange={(value, tagId) => onTagChange('type', value, tagId)}
      />

      <CategoryTagSelect
        category="series"
        label={t("misc.itemForm.tagSeriesLabel")}
        value={seriesTag}
        onChange={(value, tagId) => onTagChange('series', value, tagId)}
        contentId={contentId}
        disabled={!contentName}
      />
    </div>
  );
}
