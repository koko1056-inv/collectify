import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBasket, Repeat2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";

export function Footer() {
  const location = useLocation();
  const { t } = useLanguage();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/search"
            className={cn(
              "flex flex-col items-center",
              isActive("/search") && "text-primary"
            )}
          >
            <Search className="h-6 w-6" />
            <span className="text-xs mt-1">{t('footer.search')}</span>
          </Link>

          <button
            onClick={() => setIsWishlistModalOpen(true)}
            className="flex flex-col items-center"
          >
            <ShoppingBasket className="h-6 w-6" />
            <span className="text-xs mt-1">{t('footer.wishlist')}</span>
          </button>

          <Link
            to="/"
            className={cn(
              "flex flex-col items-center",
              isActive("/") && "text-primary"
            )}
          >
            <div className="bg-primary rounded-full p-3 -mt-6">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs mt-1">{t('footer.home')}</span>
          </Link>

          <Link
            to="/trade"
            className={cn(
              "flex flex-col items-center",
              isActive("/trade") && "text-primary"
            )}
          >
            <Repeat2 className="h-6 w-6" />
            <span className="text-xs mt-1">{t('footer.trade')}</span>
          </Link>

          <Link
            to="/edit-profile"
            className={cn(
              "flex flex-col items-center",
              isActive("/edit-profile") && "text-primary"
            )}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">{t('footer.profile')}</span>
          </Link>
        </div>
      </div>

      <WishlistViewModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />
    </>
  );
}