import { Home, Search, Swap, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function Footer() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
      <div className="flex items-center justify-around h-16">
        <Link
          to="/search"
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            isActive("/search") && "text-primary"
          )}
        >
          <Search className="h-6 w-6" />
          <span className="text-xs mt-1">検索</span>
        </Link>
        
        <Link
          to="/trade"
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            isActive("/trade") && "text-primary"
          )}
        >
          <Swap className="h-6 w-6" />
          <span className="text-xs mt-1">トレード</span>
        </Link>

        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            isActive("/") && "text-primary"
          )}
        >
          <div className="bg-primary rounded-full p-3 -mt-8">
            <Home className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs mt-1">ホーム</span>
        </Link>

        <Link
          to="/wishlist"
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            isActive("/wishlist") && "text-primary"
          )}
        >
          <Heart className="h-6 w-6" />
          <span className="text-xs mt-1">ウィッシュ</span>
        </Link>

        <Link
          to={user ? `/user/${user.id}` : "/login"}
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            (user && isActive(`/user/${user.id}`)) && "text-primary"
          )}
        >
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">マイページ</span>
        </Link>
      </div>
    </div>
  );
}