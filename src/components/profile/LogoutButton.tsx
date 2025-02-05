import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function LogoutButton() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ログアウトに失敗しました",
      });
      return;
    }
    
    toast({
      title: "ログアウト完了",
      description: "ログアウトしました",
    });
    navigate("/login");
  };

  return (
    <Button 
      variant="outline" 
      className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      ログアウト
    </Button>
  );
}