
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfficialItem } from "@/types";

export function useOfficialItems() {
  return useQuery<OfficialItem[]>({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          *,
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
