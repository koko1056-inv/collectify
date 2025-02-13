import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
export function LogoutButton() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleLogout = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ログアウトに失敗しました"
      });
      return;
    }
    toast({
      title: "ログアウト完了",
      description: "ログアウトしました"
    });
    navigate("/login");
  };
  return <Button variant="outline" size="icon" onClick={handleLogout} className="h-8 w-8 mx-[10px]">
      <LogOut className="h-4 w-4" />
    </Button>;
}