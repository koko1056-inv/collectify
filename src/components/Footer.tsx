import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBasket, Repeat2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { TradeRequestsModal } from "./trade/TradeRequestsModal";
import { UserSearchSheet } from "./UserSearchSheet";

export function Footer() {
  const location = useLocation();
  const { t } = useLanguage();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/search"
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12",
              isActive("/search") && "text-primary"
            )}
          >
            <Search className="h-6 w-6" />
            <span className="text-xs mt-1">検索</span>
          </Link>

          <Link
            to="/wishlist"
            className="flex flex-col items-center justify-center w-12 h-12"
          >
            <ShoppingBasket className="h-6 w-6" />
            <span className="text-xs mt-1">ウィッシュ</span>
          </Link>

          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center",
              isActive("/") && "text-primary"
            )}
          >
            <div className="bg-primary rounded-full p-3">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs mt-1">ホーム</span>
          </Link>

          <Link
            to="/trade"
            className="flex flex-col items-center justify-center w-12 h-12"
          >
            <Repeat2 className="h-6 w-6" />
            <span className="text-xs mt-1">トレード</span>
          </Link>

          <Link
            to="/edit-profile"
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12",
              isActive("/edit-profile") && "text-primary"
            )}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">プロフィール</span>
          </Link>
        </div>
      </div>

      <WishlistViewModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />

      <TradeRequestsModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
      />

      <UserSearchSheet
        isOpen={isSearchSheetOpen}
        onClose={() => setIsSearchSheetOpen(false)}
      />
    </>
  );
}