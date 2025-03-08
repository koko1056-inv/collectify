
import { Link, useLocation } from "react-router-dom";
import { Home, Users, ShoppingBasket, Repeat2, User } from "lucide-react";
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
          <button
            onClick={() => setIsFriendsListOpen(true)}
            className={cn(
              "flex items-center justify-center w-12 h-12"
            )}
          >
            <Users className="h-6 w-6" />
          </button>

          <button
            onClick={() => setIsWishlistModalOpen(true)}
            className="flex items-center justify-center w-12 h-12"
          >
            <ShoppingBasket className="h-6 w-6" />
          </button>

          <Link
            to="/"
            className={cn(
              "flex items-center justify-center",
              isActive("/") && "text-primary"
            )}
          >
            <div className="bg-primary rounded-full p-3">
              <Home className="h-6 w-6 text-white" />
            </div>
          </Link>

          <Link
            to="/trades"
            className={cn(
              "flex items-center justify-center w-12 h-12",
              isActive("/trades") && "text-primary"
            )}
          >
            <Repeat2 className="h-6 w-6" />
          </Link>

          <Link
            to="/edit-profile"
            className={cn(
              "flex items-center justify-center w-12 h-12",
              isActive("/edit-profile") && "text-primary"
            )}
          >
            <User className="h-6 w-6" />
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
