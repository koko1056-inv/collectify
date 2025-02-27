
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Home, Search, User, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Footer() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-around items-center bg-white py-3 px-2 border-t">
        <Link
          to="/"
          className={`flex flex-col items-center text-xs ${
            isActive("/") ? "text-primary font-bold" : "text-gray-500"
          }`}
        >
          <Home className="h-6 w-6 mb-1" />
          ホーム
        </Link>
        <Link
          to="/search"
          className={`flex flex-col items-center text-xs ${
            isActive("/search") ? "text-primary font-bold" : "text-gray-500"
          }`}
        >
          <Search className="h-6 w-6 mb-1" />
          検索
        </Link>
        <Link
          to="/messages"
          className={`flex flex-col items-center text-xs ${
            isActive("/messages") ? "text-primary font-bold" : "text-gray-500"
          }`}
        >
          <Users className="h-6 w-6 mb-1" />
          フレンド
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center text-xs ${
            isActive("/profile") ? "text-primary font-bold" : "text-gray-500"
          }`}
        >
          <User className="h-6 w-6 mb-1" />
          プロフィール
        </Link>
      </div>
    </div>
  );
}
