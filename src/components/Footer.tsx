
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Package, Users, User } from "lucide-react";
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
        <div className="flex flex-col w-full">
          {/* ナビゲーションボタン */}
          <div className="flex justify-around items-center h-16">
            <Link
              to="/"
              className={cn(
                "flex flex-col items-center justify-center w-1/5 text-[10px]",
                isActive("/") ? "text-primary" : "text-gray-500"
              )}
            >
              <Home className={cn("h-6 w-6 mb-1", isActive("/") ? "text-primary" : "text-gray-400")} />
              <span>{t("footer.home")}</span>
            </Link>
            
            <Link
              to="/search"
              className={cn(
                "flex flex-col items-center justify-center w-1/5 text-[10px]",
                isActive("/search") ? "text-primary" : "text-gray-500"
              )}
            >
              <Search className={cn("h-6 w-6 mb-1", isActive("/search") ? "text-primary" : "text-gray-400")} />
              <span>{t("footer.search")}</span>
            </Link>

            <Link
              to="/my-room"
              className={cn(
                "flex flex-col items-center justify-center w-1/5 text-[10px]",
                isActive("/my-room") ? "text-primary" : "text-gray-500"
              )}
            >
              <svg className={cn("h-6 w-6 mb-1", isActive("/my-room") ? "text-primary" : "text-gray-400")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>マイルーム</span>
            </Link>

            <Link
              to="/collection"
              className={cn(
                "flex flex-col items-center justify-center w-1/5 text-[10px]",
                isActive("/collection") ? "text-primary" : "text-gray-500"
              )}
            >
              <Package className={cn("h-6 w-6 mb-1", isActive("/collection") ? "text-primary" : "text-gray-400")} />
              <span>{t("footer.collection")}</span>
            </Link>

            <Link
              to="/edit-profile"
              className={cn(
                "flex flex-col items-center justify-center w-1/5 text-[10px]",
                isActive("/edit-profile") ? "text-primary" : "text-gray-500"
              )}
            >
              <User className={cn("h-6 w-6 mb-1", isActive("/edit-profile") ? "text-primary" : "text-gray-400")} />
              <span>{t("footer.profile")}</span>
            </Link>
          </div>
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
