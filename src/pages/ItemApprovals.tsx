
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Check, X } from "lucide-react";

export default function ItemApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Fetch pending submissions
  const { data: submissions, isLoading } = useQuery({
    queryKey: ["item-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_submissions")
        .select(`
          *,
          profiles:submitted_by (username)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.is_admin,
  });

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const submission = submissions?.find(s => s.id === submissionId);
      if (!submission) throw new Error("Submission not found");

      // First create the official item
      const { data: officialItem, error: createError } = await supabase
        .from("official_items")
        .insert([{
          title: submission.title,
          description: submission.description,
          image: submission.image,
          price: submission.price,
          content_name: submission.content_name,
          release_date: new Date().toISOString(),
          created_by: submission.submitted_by,
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
          reviewed_by: user?.id,
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
          reviewed_by: user?.id,
          rejection_reason: reason,
        })
        .eq("id", submissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-submissions"] });
      setSelectedItem(null);
      setRejectionReason("");
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
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={submission.image}
                        alt={submission.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <h3 className="font-medium">{submission.title}</h3>
                        <p className="text-sm text-gray-500">
                          提案者: {submission.profiles.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          提案日: {format(new Date(submission.created_at), 'yyyy/MM/dd HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveMutation.mutate(submission.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        承認
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setSelectedItem(submission)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        却下
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アイテムの却下理由</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="却下理由を入力してください"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedItem(null);
                setRejectionReason("");
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedItem) {
                  rejectMutation.mutate({
                    submissionId: selectedItem.id,
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              却下する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
