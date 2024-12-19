import { Button } from "@/components/ui/button";
import { Heart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">
          AnimeCollect
        </Link>
        
        <div className="flex items-center gap-4">
          {profile?.is_admin && (
            <Link to="/admin">
              <Button variant="outline">管理者ページ</Button>
            </Link>
          )}
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
          </Button>
          <Link to="/profile">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          {user ? (
            <Button
              variant="outline"
              onClick={() => supabase.auth.signOut()}
            >
              ログアウト
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="default">
                ログイン
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}