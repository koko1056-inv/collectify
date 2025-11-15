
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";

export function useTags(contentName?: string) {
  return useQuery<Tag[]>({
    queryKey: ["tags", contentName],
    queryFn: async () => {
      let query = supabase
        .from("tags")
        .select("*, content_names!tags_content_id_fkey(id, name)")
        .order("name");
      
      if (contentName && contentName !== "all") {
        // コンテンツ名からコンテンツIDを取得
        const { data: contentData } = await supabase
          .from("content_names")
          .select("id")
          .eq("name", contentName)
          .single();
        
        if (contentData) {
          // キャラクターとシリーズはコンテンツIDでフィルタリング、タイプはcontent_idがnull
          query = query.or(`content_id.eq.${contentData.id},and(category.eq.type,content_id.is.null)`);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
