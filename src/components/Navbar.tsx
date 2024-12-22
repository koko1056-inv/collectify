import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserInfo } from "./UserInfo";
import { Heart, UserSearch } from "lucide-react";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { UserSearchModal } from "./UserSearchModal";

export function Navbar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="flex h-14 sm:h-16 items-center px-2 sm:px-4 container mx-auto">
        <Link to="/" className="logo-text">
          Collectify
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <UserInfo />
          {user ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSearchModalOpen(true)}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <UserSearch className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsWishlistModalOpen(true)}
                className="relative h-8 w-8 sm:h-9 sm:w-9"
              >
                <Heart className="h-4 w-4" />
              </Button>
              {user.email === 'admin@example.com' && (
                <Link to="/admin">
                  <Button variant="outline" className="text-sm">管理画面</Button>
                </Link>
              )}
              <Button onClick={handleLogout} variant="outline" className="text-sm">
                ログアウト
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="outline" className="text-sm">ログイン</Button>
            </Link>
          )}
        </div>
      </div>
      <WishlistViewModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </nav>
  );
}