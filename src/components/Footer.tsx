import { Link, useLocation } from "react-router-dom";
import { User, Compass, Home, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export function Footer() {
  const location = useLocation();
  const { t } = useLanguage();

  // 探索ページ判定（/explore と旧 /rooms/explore の両方をactive扱い）
  const isExploreActive =
    location.pathname.startsWith("/explore") || location.pathname.startsWith("/rooms/explore");
  const isActive = (path: string) =>
    path === "/explore" ? isExploreActive : location.pathname === path;

  // AI生成（ルーム/アバター）を主役、コレクションを素材庫とする方針に基づく
  // 4タブ構成: ホーム / 探索 / コレクション / プロフィール
  const tabs = [
    { to: "/my-room", icon: Home, label: "ホーム" },
    { to: "/explore", icon: Compass, label: "探索" },
    { to: "/collection", icon: Package, label: "コレクション" },
    { to: "/edit-profile", icon: User, label: "プロフィール" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t sm:hidden z-50">
      <div className="flex items-center justify-around h-16 relative">
        {tabs.map(({ to, icon: Icon, label }) => {
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
        })}
      </div>
    </div>
  );
}
