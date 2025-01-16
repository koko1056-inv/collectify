import { Home, User, PlusCircle, Search, BookMarked } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserSearchModal } from "./UserSearchModal";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Footer() {
  const location = useLocation();
  const { user } = useAuth();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!user || !isMobile) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-6 z-50">
        <div className="flex justify-between items-center max-w-screen-xl mx-auto">
          <Link
            to="/"
            className={isActive("/") ? "text-purple-500" : "text-gray-500"}
          >
            <Home className="h-6 w-6" />
          </Link>

          <Link
            to="/memories"
            className={isActive("/memories") ? "text-purple-500" : "text-gray-500"}
          >
            <BookMarked className="h-6 w-6" />
          </Link>

          <Link
            to="/add-item"
            className={isActive("/add-item") ? "text-purple-500" : "text-gray-500"}
          >
            <PlusCircle className="h-6 w-6" />
          </Link>

          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="text-gray-500"
          >
            <Search className="h-6 w-6" />
          </button>

          <Link
            to={`/user/${user.id}`}
            className={isActive(`/user/${user.id}`) ? "text-purple-500" : "text-gray-500"}
          >
            <User className="h-6 w-6" />
          </Link>
        </div>
      </div>

      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}