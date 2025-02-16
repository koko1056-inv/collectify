
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Submission = {
  id: string;
  title: string;
  image: string;
  created_at: string;
  description: string | null;
  price: string;
  content_name: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_by: string;
  submitter: {
    username: string | null;
  } | null;
};

export function useSubmissions(isAdmin: boolean) {
  return useQuery({
    queryKey: ["item-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_submissions")
        .select(`
          *,
          submitter:profiles!item_submissions_submitted_by_fkey(username)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const submissions: Submission[] = data.map(item => ({
        ...item,
        submitter: item.submitter?.[0] || null
      }));

      return submissions;
    },
    enabled: isAdmin,
  });
}
