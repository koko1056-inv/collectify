import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function UserSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [userId, setUserId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!userId.trim()) {
      toast({
        title: "エラー",
        description: "ユーザーIDを入力してください",
        variant: "destructive",
      });
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      toast({
        title: "エラー",
        description: "ユーザーが見つかりませんでした",
        variant: "destructive",
      });
      return;
    }

    navigate(`/user/${userId}`);
    onClose();
    setUserId("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ユーザー検索</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Input
              placeholder="ユーザーIDを入力"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <Button onClick={handleSearch} className="w-full">
            検索
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}