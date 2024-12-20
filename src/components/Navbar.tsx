import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserInfo } from "./UserInfo";

export function Navbar() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ログアウトに失敗しました",
      });
    } else {
      toast({
        title: "ログアウト完了",
        description: "ログアウトしました",
      });
    }
  };

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link to="/" className="logo-text">
          Collectify
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          <UserInfo />
          {user ? (
            <>
              {user.email === 'admin@example.com' && (
                <Link to="/admin">
                  <Button variant="outline">管理画面</Button>
                </Link>
              )}
              <Button onClick={handleLogout} variant="outline">
                ログアウト
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="outline">ログイン</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}