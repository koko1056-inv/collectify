import { Home, Search, RefreshCw, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export function Footer() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

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
          <span className="text-xs mt-1">{t('footer.search')}</span>
        </Link>
        
        <Link
          to="/trade"
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            isActive("/trade") && "text-primary"
          )}
        >
          <RefreshCw className="h-6 w-6" />
          <span className="text-xs mt-1">{t('footer.trade')}</span>
        </Link>

        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            isActive("/") && "text-primary"
          )}
        >
          <div className="bg-primary rounded-full p-3 -mt-4">
            <Home className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs mt-1">{t('footer.home')}</span>
        </Link>

        <Link
          to="/wishlist"
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            isActive("/wishlist") && "text-primary"
          )}
        >
          <Heart className="h-6 w-6" />
          <span className="text-xs mt-1">{t('footer.wishlist')}</span>
        </Link>

        <Link
          to={user ? `/user/${user.id}` : "/login"}
          className={cn(
            "flex flex-col items-center justify-center w-1/5 text-gray-500",
            (user && isActive(`/user/${user.id}`)) && "text-primary"
          )}
        >
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">{t('footer.mypage')}</span>
        </Link>
      </div>
    </div>
  );
}