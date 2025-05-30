
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useItemDetails(itemId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["item-details", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("id, title, image, price, description, release_date, content_name")
        .eq("id", itemId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!itemId,
  });
}
