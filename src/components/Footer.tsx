
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Package, ArrowLeftRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { UserSearchSheet } from "./UserSearchSheet";
import { FriendsListSheet } from "./FriendsListSheet";

export function Footer() {
  const location = useLocation();
  const { t } = useLanguage();
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [isFriendsListOpen, setIsFriendsListOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden">
        {/* ヘッダー部分（ロゴを上部に配置） */}
        <div className="flex items-center justify-center py-2 border-b border-gray-100">
          <span className="logo-text text-lg">Collectify</span>
        </div>
        
        {/* ナビゲーションボタン */}
        <div className="flex justify-around items-center h-16">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/") ? "text-primary" : "text-gray-500"
            )}
          >
            <Home className={cn("h-6 w-6 mb-1", isActive("/") ? "text-primary" : "text-gray-400")} />
            <span>{t("footer.home")}</span>
          </Link>
          
          <Link
            to="/search"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/search") ? "text-primary" : "text-gray-500"
            )}
          >
            <Search className={cn("h-6 w-6 mb-1", isActive("/search") ? "text-primary" : "text-gray-400")} />
            <span>{t("footer.search")}</span>
          </Link>

          <Link
            to="/collection"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/collection") ? "text-primary" : "text-gray-500"
            )}
          >
            <Package className={cn("h-6 w-6 mb-1", isActive("/collection") ? "text-primary" : "text-gray-400")} />
            <span>{t("footer.collection")}</span>
          </Link>

          <Link
            to="/trades"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/trades") ? "text-primary" : "text-gray-500"
            )}
          >
            <ArrowLeftRight className={cn("h-6 w-6 mb-1", isActive("/trades") ? "text-primary" : "text-gray-400")} />
            <span>{t("footer.trade")}</span>
          </Link>

          <Link
            to="/edit-profile"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/edit-profile") ? "text-primary" : "text-gray-500"
            )}
          >
            <User className={cn("h-6 w-6 mb-1", isActive("/edit-profile") ? "text-primary" : "text-gray-400")} />
            <span>{t("footer.profile")}</span>
          </Link>
        </div>
      </div>

      <UserSearchSheet
        isOpen={isSearchSheetOpen}
        onClose={() => setIsSearchSheetOpen(false)}
      />

      <FriendsListSheet
        isOpen={isFriendsListOpen}
        onClose={() => setIsFriendsListOpen(false)}
      />
    </>
  );
}
