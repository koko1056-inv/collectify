
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSubmissions(isAdmin: boolean) {
  return useQuery({
    queryKey: ["item-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_submissions")
        .select(`
          *,
          submitter:profiles!item_submissions_submitted_by_fkey (
            username
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });
}
