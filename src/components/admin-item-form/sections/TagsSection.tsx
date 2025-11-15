
import { CategoryTagSelect } from "../../tag/CategoryTagSelect";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TagsSectionProps {
  characterTag: string | null;
  typeTag: string | null;
  seriesTag: string | null;
  contentName: string | null;
  onTagChange: (category: string, value: string | null) => void;
}

export function TagsSection({
  characterTag,
  typeTag,
  seriesTag,
  contentName,
  onTagChange,
}: TagsSectionProps) {
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
        label="キャラクター・人物名"
        value={characterTag}
        onChange={(value) => onTagChange('character', value)}
        contentId={contentId}
        disabled={!contentName}
      />

      <CategoryTagSelect
        category="type"
        label="グッズタイプ"
        value={typeTag}
        onChange={(value) => onTagChange('type', value)}
      />

      <CategoryTagSelect
        category="series"
        label="グッズシリーズ"
        value={seriesTag}
        onChange={(value) => onTagChange('series', value)}
        contentId={contentId}
        disabled={!contentName}
      />
    </div>
  );
}
