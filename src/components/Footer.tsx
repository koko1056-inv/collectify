import { Home, User, PlusCircle, Search, BookMarked } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserSearchModal } from "./UserSearchModal";
import { useState } from "react";

export function Footer() {
  const location = useLocation();
  const { user } = useAuth();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-6 z-50">
        <div className="flex justify-between items-center max-w-screen-xl mx-auto">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 min-w-[64px] ${
              isActive("/") ? "text-purple-500" : "text-gray-500"
            }`}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs">ホーム</span>
          </Link>

          <Link
            to="/memories"
            className={`flex flex-col items-center gap-1 min-w-[64px] ${
              isActive("/memories") ? "text-purple-500" : "text-gray-500"
            }`}
          >
            <BookMarked className="h-6 w-6" />
            <span className="text-xs">思い出</span>
          </Link>

          <Link
            to="/add-item"
            className={`flex flex-col items-center gap-1 min-w-[64px] ${
              isActive("/add-item") ? "text-purple-500" : "text-gray-500"
            }`}
          >
            <PlusCircle className="h-6 w-6" />
            <span className="text-xs">追加</span>
          </Link>

          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex flex-col items-center gap-1 min-w-[64px] text-gray-500"
          >
            <Search className="h-6 w-6" />
            <span className="text-xs">検索</span>
          </button>

          <Link
            to={`/user/${user.id}`}
            className={`flex flex-col items-center gap-1 min-w-[64px] ${
              isActive(`/user/${user.id}`) ? "text-purple-500" : "text-gray-500"
            }`}
          >
            <User className="h-6 w-6" />
            <span className="text-xs">マイページ</span>
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