
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Package, ArrowLeftRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { UserSearchSheet } from "./UserSearchSheet";
import { FriendsListSheet } from "./FriendsListSheet";

export function Footer() {
  const location = useLocation();
  const { t } = useLanguage();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [isFriendsListOpen, setIsFriendsListOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/") ? "text-primary" : "text-gray-500"
            )}
          >
            <Home className={cn("h-6 w-6 mb-1", isActive("/") ? "text-primary" : "text-gray-400")} />
            <span>ホーム</span>
          </Link>
          
          <Link
            to="/search"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/search") ? "text-primary" : "text-gray-500"
            )}
          >
            <Search className={cn("h-6 w-6 mb-1", isActive("/search") ? "text-primary" : "text-gray-400")} />
            <span>探す</span>
          </Link>

          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/collection") ? "text-primary" : "text-gray-500"
            )}
            onClick={(e) => {
              e.preventDefault();
              setIsWishlistModalOpen(true);
            }}
          >
            <Package className={cn("h-6 w-6 mb-1", isActive("/collection") ? "text-primary" : "text-gray-400")} />
            <span>コレクション</span>
          </Link>

          <Link
            to="/trades"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/trades") ? "text-primary" : "text-gray-500"
            )}
          >
            <ArrowLeftRight className={cn("h-6 w-6 mb-1", isActive("/trades") ? "text-primary" : "text-gray-400")} />
            <span>トレード</span>
          </Link>

          <Link
            to="/edit-profile"
            className={cn(
              "flex flex-col items-center justify-center w-1/5 text-xs",
              isActive("/edit-profile") ? "text-primary" : "text-gray-500"
            )}
          >
            <User className={cn("h-6 w-6 mb-1", isActive("/edit-profile") ? "text-primary" : "text-gray-400")} />
            <span>プロフィール</span>
          </Link>
        </div>
      </div>

      <WishlistViewModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />

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
