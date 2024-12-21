import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function UserSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!username.trim()) {
      toast({
        title: "エラー",
        description: "ユーザー名を入力してください",
        variant: "destructive",
      });
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    if (error || !profile) {
      toast({
        title: "エラー",
        description: "ユーザーが見つかりませんでした",
        variant: "destructive",
      });
      return;
    }

    navigate(`/user/${profile.id}`);
    onClose();
    setUsername("");
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
              placeholder="ユーザー名を入力"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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