import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfficialItem } from "@/types";

export function useOfficialItems() {
  return useQuery<OfficialItem[]>({
    queryKey: ["official-items"],
    staleTime: 0, // 常に最新データを取得
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          id,
          title,
          image,
          price,
          release_date,
          created_at,
          created_by,
          content_name,
          description,
          item_type,
          quantity,
          item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(item => ({
        ...item,
        artist: null,
        anime: null
      })) as OfficialItem[];
    },
  });
}