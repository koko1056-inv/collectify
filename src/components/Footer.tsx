import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, Compass, Package, Sparkles, Search, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  const isExploreActive =
    location.pathname.startsWith("/explore") || location.pathname.startsWith("/rooms/explore");
  const isStudioActive =
    location.pathname === "/ai-rooms" ||
    (location.pathname === "/my-room" && location.search.includes("tab=studio")) ||
    (location.pathname === "/my-room" && location.search.includes("tab=avatar"));

  const isActive = (path: string) => {
    if (path === "/explore") return isExploreActive;
    if (path === "/ai-rooms") return isStudioActive;
    if (path === "/my-room") return location.pathname === "/my-room" && !isStudioActive;
    return location.pathname === path;
  };

  const leftTabs = [
    { to: "/ai-rooms", icon: Palette, label: "AIスタジオ" },
    { to: "/explore", icon: Compass, label: "探索" },
  ];
  const rightTabs = [
    { to: "/collection", icon: Package, label: "コレクション" },
    { to: "/edit-profile", icon: User, label: "プロフィール" },
  ];

  const renderTab = ({ to, icon: Icon, label }: typeof leftTabs[number]) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        className={cn(
          "flex flex-col items-center justify-center flex-1 py-2 transition-colors",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6 mb-0.5 transition-transform",
            active && "scale-110"
          )}
        />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t sm:hidden z-50">
      <div className="flex items-center justify-around h-16 relative">
        {leftTabs.map(renderTab)}
        {/* 中央: グッズを探す */}
        <div className="flex-1 flex items-center justify-center">
          <div className="-mt-8 flex flex-col items-center">
            <motion.button
              onClick={() => navigate("/search")}
              whileTap={{ scale: 0.95 }}
              aria-label="グッズを探す"
              className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center shadow-lg",
                "bg-primary text-primary-foreground hover:shadow-xl transition-all"
              )}
            >
              <Search className="h-7 w-7" />
            </motion.button>
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5">みつける</span>
          </div>
        </div>
        {rightTabs.map(renderTab)}
      </div>
    </div>
  );
}
