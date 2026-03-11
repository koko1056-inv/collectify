import { Link, useLocation } from "react-router-dom";
import { Search, User, Compass, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { FloatingActionButton } from "./navigation/FloatingActionButton";

export function Footer() {
  const location = useLocation();
  const { t } = useLanguage();

  const isActive = (path: string) => location.pathname === path;

  // 画像提案に基づいた3タブ + FAB構成
  // 発見(Search) - ホーム(MyRoom) - プロフィール(EditProfile)
  // 中央にFABを配置

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t sm:hidden z-50">
      <div className="flex items-center justify-around h-16 relative">
        {/* 発見タブ */}
        <Link
          to="/search"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-2",
            isActive("/search") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Compass className={cn(
            "h-6 w-6 mb-0.5 transition-all",
            isActive("/search") && "scale-110"
          )} />
          <span className="text-[10px] font-medium">発見</span>
        </Link>

        {/* ホームタブ */}
        <Link
          to="/my-room"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-2",
            isActive("/my-room") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Home className={cn(
            "h-6 w-6 mb-0.5 transition-all",
            isActive("/my-room") && "scale-110"
          )} />
          <span className="text-[10px] font-medium">ホーム</span>
        </Link>


        {/* コミュニティタブ */}
        <Link
          to="/posts"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-2",
            isActive("/posts") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <svg 
            className={cn(
              "h-6 w-6 mb-0.5 transition-all",
              isActive("/posts") && "scale-110"
            )} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-[10px] font-medium">コミュニティ</span>
        </Link>

        {/* プロフィールタブ */}
        <Link
          to="/edit-profile"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-2",
            isActive("/edit-profile") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <User className={cn(
            "h-6 w-6 mb-0.5 transition-all",
            isActive("/edit-profile") && "scale-110"
          )} />
          <span className="text-[10px] font-medium">プロフィール</span>
        </Link>
      </div>
    </div>
  );
}
