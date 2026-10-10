import { Link, useLocation, useNavigate } from "react-router-dom";
import { isNavActive } from "@/components/navigation/navGroups";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserInfo } from "./UserInfo";
import { ShoppingBasket, User, Globe, Palette, HelpCircle, Compass, Home, Boxes, ArrowLeftRight, Plus, MessageCircle, Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { AddGoodsSheet } from "@/components/collection/AddGoodsSheet";
import { TradeInboxButton } from "./trade/TradeInboxButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeColor, themeColors } from "@/contexts/ThemeColorContext";
import { MessagesNavButton } from "./MessagesNavButton";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notifications/NotificationBell";
import { PointsNavButton } from "./shop/PointsNavButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function Navbar() {
  const {
    user
  } = useAuth();
  const {
    t,
    language,
    setLanguage
  } = useLanguage();
  const { themeColor, setThemeColor } = useThemeColor();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile
  } = useProfile(user?.id);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isAddGoodsOpen, setIsAddGoodsOpen] = useState(false);
  const handleLogout = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("common.error"), {
        description: t("chrome.nav.logoutFailed"),
      });
    } else {
      toast.success(t("chrome.nav.logoutDoneTitle"), {
        description: t("chrome.nav.logoutDoneDesc"),
      });
      navigate("/login");
    }
  };
  const unreadMessages = useUnreadMessageCount();

  // アバターのメニュー。モバイルとデスクトップで同じ中身にする
  // （以前のデスクトップ版にはプロフィールもログアウトも無く、どこにも辿り着けなかった）
  const accountMenu = (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onClick={() => navigate("/edit-profile")}>
        <User className="w-4 h-4 mr-2" />
        {t("chrome.nav.profile")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate("/messages")}>
        <MessageCircle className="w-4 h-4 mr-2" />
        {t("chrome.nav.messages")}
        {unreadMessages > 0 && (
          <span className="ml-auto rounded-full bg-destructive px-1.5 text-3xs font-bold leading-4 tabular-nums text-destructive-foreground">
            {unreadMessages > 9 ? "9+" : unreadMessages}
          </span>
        )}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate("/edit-profile?settings=1")}>
        <Settings className="w-4 h-4 mr-2" />
        {t("chrome.nav.settings")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate("/how-to-use")}>
        <HelpCircle className="w-4 h-4 mr-2" />
        {t("chrome.nav.howToUse")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="flex items-center gap-2">
        <Globe className="w-4 h-4" />
        {t("chrome.nav.language")}
      </DropdownMenuLabel>
      <DropdownMenuItem onClick={() => setLanguage("ja")} className={language === "ja" ? "bg-accent" : ""}>
        🇯🇵 日本語
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-accent" : ""}>
        🇺🇸 English
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="flex items-center gap-2">
        <Palette className="w-4 h-4" />
        {t("chrome.nav.themeColor")}
      </DropdownMenuLabel>
      {themeColors.map((color) => (
        <DropdownMenuItem
          key={color.value}
          onClick={() => setThemeColor(color.value)}
          className={themeColor === color.value ? "bg-accent" : ""}
        >
          {color.emoji} {t(`chrome.themeColor.${color.value}`)}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
        <LogOut className="w-4 h-4 mr-2" />
        {t("chrome.nav.logout")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const avatarTrigger = (
    <DropdownMenuTrigger asChild>
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80"
        aria-label={t("chrome.nav.accountMenu")}
      >
        <Avatar className="w-8 h-8 border-2 border-border hover:border-primary transition-colors">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-muted">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </button>
    </DropdownMenuTrigger>
  );
  return <nav className="relative z-50 bg-background border-b shadow-sm">
      {/* モバイル版のヘッダー (sm未満でのみ表示)。ロゴは左、操作は右にまとめる */}
      <div className="flex sm:hidden items-center justify-between gap-2 h-12 bg-background pl-4 pr-2 pt-[env(safe-area-inset-top)]">
        <Link to="/collection" className="logo-text text-xl">
          Collectify
        </Link>
        {user && <div className="flex items-center">
            <PointsNavButton variant="icon" />
            <MessagesNavButton unreadCount={unreadMessages} />
            <NotificationBell className="sm:hidden" />
            <DropdownMenu>
              {avatarTrigger}
              {accountMenu}
            </DropdownMenu>
          </div>}
      </div>
      
      {/* デスクトップ版のナビゲーション */}
      <div className="hidden sm:flex h-16 items-center px-4 container mx-auto">
        <Link to="/" className="logo-text text-xl font-bold mr-8">
          Collectify
        </Link>
        
        {/* ナビゲーションメニュー。モバイルの下タブと同じ並び・同じ行き先にする。
            コレクション / 交換 / 追加 / みんな / マイルーム */}
        {user && <NavigationMenu data-tour="nav-bar" className="mr-auto">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/collection" aria-current={isNavActive("/collection", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), isNavActive("/collection", location.pathname) && "bg-accent text-primary")}>
                  <Boxes className="h-4 w-4 mr-2" />
                  {t("chrome.nav.collection")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/trade" aria-current={isNavActive("/trade", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), isNavActive("/trade", location.pathname) && "bg-accent text-primary")}>
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {t("chrome.nav.trade")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                {/* 下タブ中央の追加ボタンに相当する入口。デスクトップには
                    下タブが無いので、ここが無いと常設の追加導線が消える。 */}
                <button
                  type="button"
                  data-tour="collection-add"
                  onClick={() => setIsAddGoodsOpen(true)}
                  className={cn(navigationMenuTriggerStyle())}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("chrome.nav.add")}
                </button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/explore" aria-current={isNavActive("/explore", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), isNavActive("/explore", location.pathname) && "bg-accent text-primary")}>
                  <Compass className="h-4 w-4 mr-2" />
                  {t("chrome.nav.explore")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/my-room" aria-current={isNavActive("/my-room", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), isNavActive("/my-room", location.pathname) && "bg-accent text-primary")}>
                  <Home className="h-4 w-4 mr-2" />
                  {t("chrome.nav.myRoom")}
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>}
        
        {/* 右側のアクション */}
        <div className="ml-auto flex items-center gap-4">
          <UserInfo />
          {user ? <>
              
              <Button variant="outline" size="icon" onClick={() => setIsWishlistModalOpen(true)} className="relative h-8 w-8" aria-label={t("chrome.nav.wishlist")} title={t("chrome.nav.wishlist")}>
                <ShoppingBasket className="h-4 w-4 text-foreground" />
              </Button>
              
              <TradeInboxButton />
              <MessagesNavButton unreadCount={unreadMessages} />
              <NotificationBell className="hidden sm:block" />
              
              <DropdownMenu>
                {avatarTrigger}
                {accountMenu}
              </DropdownMenu>
              
            </> : <Link to="/login">
              <Button variant="outline" className="text-sm">
                {t("nav.login")}
              </Button>
            </Link>}
        </div>
      </div>
      
      <WishlistViewModal isOpen={isWishlistModalOpen} onClose={() => setIsWishlistModalOpen(false)} />
      <AddGoodsSheet open={isAddGoodsOpen} onOpenChange={setIsAddGoodsOpen} />
    </nav>;
}