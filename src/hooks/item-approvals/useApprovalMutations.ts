
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useApprovalMutations(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const { data: submissions } = await supabase
        .from("item_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (!submissions) throw new Error("Submission not found");

      // First create the official item
      const { data: officialItem, error: createError } = await supabase
        .from("official_items")
        .insert([{
          title: submissions.title,
          description: submissions.description,
          image: submissions.image,
          price: submissions.price,
          content_name: submissions.content_name,
          release_date: new Date().toISOString(),
          created_by: submissions.submitted_by,
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Then update the submission status
      const { error: updateError } = await supabase
        .from("item_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      return officialItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-submissions"] });
      toast({
        title: "承認完了",
        description: "アイテムが承認され、公式グッズリストに追加されました。",
      });
    },
    onError: (error) => {
      console.error("Error approving item:", error);
      toast({
        title: "エラー",
        description: "アイテムの承認中にエラーが発生しました。",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string, reason: string }) => {
      const { error } = await supabase
        .from("item_submissions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          rejection_reason: reason,
        })
        .eq("id", submissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-submissions"] });
      toast({
        title: "却下完了",
        description: "アイテムが却下されました。",
      });
    },
    onError: (error) => {
      console.error("Error rejecting item:", error);
      toast({
        title: "エラー",
        description: "アイテムの却下中にエラーが発生しました。",
        variant: "destructive",
      });
    },
  });

  return {
    approveMutation,
    rejectMutation,
  };
}
