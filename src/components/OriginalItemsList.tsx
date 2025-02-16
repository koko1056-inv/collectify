
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OriginalItem } from "@/types";
import { OfficialItemsHeader } from "./official-goods/OfficialItemsHeader";
import { OfficialItemsGrid } from "./official-goods/OfficialItemsGrid";

type SortOption = "newest" | "oldest" | "wishlist" | "owners";

export function OriginalItemsList() {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  
  const { data: items = [] } = useQuery({
    queryKey: ["original-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("original_items")
        .select(`
          *,
          original_item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as OriginalItem[];
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <OfficialItemsHeader sortBy={sortBy} onSortChange={setSortBy} />
      <OfficialItemsGrid items={items} />
    </div>
  );
}
