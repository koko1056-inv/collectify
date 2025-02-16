
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { PendingSubmissionCard } from "@/components/item-approvals/PendingSubmissionCard";
import { RejectionDialog } from "@/components/item-approvals/RejectionDialog";
import { useSubmissions } from "@/hooks/item-approvals/useSubmissions";
import { useApprovalMutations } from "@/hooks/item-approvals/useApprovalMutations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ItemApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Check if user is admin
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: submissions, isLoading } = useSubmissions(!!profile?.is_admin);
  const { approveMutation, rejectMutation } = useApprovalMutations(user?.id);

  // Redirect if not admin
  if (!profile?.is_admin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>承認待ちアイテム一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>読み込み中...</div>
            ) : submissions?.length === 0 ? (
              <div>承認待ちのアイテムはありません。</div>
            ) : (
              <div className="space-y-4">
                {submissions?.map((submission) => (
                  <PendingSubmissionCard
                    key={submission.id}
                    submission={submission}
                    onApprove={() => approveMutation.mutate(submission.id)}
                    onReject={setSelectedItem}
                    isApproving={approveMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <RejectionDialog
        isOpen={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setRejectionReason("");
        }}
        reason={rejectionReason}
        onReasonChange={setRejectionReason}
        onReject={() => {
          if (selectedItem) {
            rejectMutation.mutate({
              submissionId: selectedItem.id,
              reason: rejectionReason,
            });
            setSelectedItem(null);
            setRejectionReason("");
          }
        }}
        isRejecting={rejectMutation.isPending}
      />
    </div>
  );
}
