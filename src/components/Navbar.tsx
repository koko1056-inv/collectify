import { Button } from "@/components/ui/button";
import { Heart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";

export function Navbar() {
  const { user } = useAuth();
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

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
    <>
      <nav className="border-b border-gray-100 bg-white shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900">
            AnimeCollect
          </Link>
          
          <div className="flex items-center gap-4">
            {profile?.is_admin && (
              <Link to="/admin">
                <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                  管理者ページ
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsWishlistOpen(true)}
              className="hover:bg-gray-50"
            >
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-gray-50">
              <User className="h-5 w-5" />
            </Button>
            <Link to="/login">
              <Button variant="default" className="bg-gray-900 hover:bg-gray-800">
                ログイン
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      <WishlistViewModal 
        isOpen={isWishlistOpen} 
        onClose={() => setIsWishlistOpen(false)} 
      />
    </>
  );
}