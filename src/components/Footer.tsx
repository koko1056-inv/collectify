import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBasket, Repeat2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { TradeRequestsModal } from "./trade/TradeRequestsModal";
import { UserSearchSheet } from "./UserSearchSheet";

export function Footer() {
  const location = useLocation();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center text-xs",
              isActive("/") ? "text-primary" : "text-gray-500"
            )}
          >
            <Home className="h-6 w-6 mb-1" />
            ホーム
          </Link>

          <Link
            to="/collection"
            className={cn(
              "flex flex-col items-center justify-center text-xs",
              isActive("/collection") ? "text-primary" : "text-gray-500"
            )}
          >
            <ShoppingBasket className="h-6 w-6 mb-1" />
            コレクション
          </Link>

          <Link
            to="/feed"
            className={cn(
              "flex flex-col items-center justify-center text-xs",
              isActive("/feed") ? "text-primary" : "text-gray-500"
            )}
          >
            <Search className="h-6 w-6 mb-1" />
            コミュニティ
          </Link>

          <button
            onClick={() => setIsTradeModalOpen(true)}
            className="flex flex-col items-center justify-center text-xs text-gray-500"
          >
            <Repeat2 className="h-6 w-6 mb-1" />
            トレード
          </button>

          <Link
            to="/edit-profile"
            className={cn(
              "flex flex-col items-center justify-center text-xs",
              isActive("/edit-profile") ? "text-primary" : "text-gray-500"
            )}
          >
            <User className="h-6 w-6 mb-1" />
            マイページ
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