import { Link, useLocation, useNavigate } from "react-router-dom";
import { isNavActive } from "@/components/navigation/navGroups";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserInfo } from "./UserInfo";
import { ShoppingBasket, User, HelpCircle, Compass, Boxes, ArrowLeftRight, Plus, MessageCircle, Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { AddGoodsSheet } from "@/components/collection/AddGoodsSheet";
import { TradeInboxButton } from "./trade/TradeInboxButton";
import { useLanguage } from "@/contexts/LanguageContext";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
/**
 * ヘッダー右上のアイコンボタンの形。枠なしの丸・当たり判定40px・アイコン20px。
 * 交換の入口（TradeInboxButton）は枠付きの四角が既定なので、ここから上書きしてそろえる。
 * 件数バッジ（直下の span）の位置と縁も、メッセージ・通知の NavCountBadge に合わせる。
 */
const HEADER_ICON_BUTTON =
  "relative h-10 w-10 rounded-full border-0 bg-transparent text-foreground shadow-none hover:bg-muted hover:text-foreground [&_svg]:size-5 [&>span]:right-0.5 [&>span]:top-0.5 [&>span]:ring-2 [&>span]:ring-background";

/**
 * デスクトップのナビの項目。lg 未満は文字を隠してアイコンだけにし、左右の余白も詰める。
 * 以前は 640〜1023px で項目の文字が幅を取り、右側のボタン（メッセージ・通知・アバター）が
 * 画面の外へはみ出して見えなかった。文字は sr-only で読み上げには残し、title で名前を出す。
 */
const NAV_ITEM = "px-2 md:px-3 xl:px-4";
const NAV_ICON = "h-4 w-4 lg:mr-2";
const NAV_LABEL = "sr-only lg:not-sr-only";

export function Navbar() {
  const {
    user
  } = useAuth();
  const { t } = useLanguage();
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
  // （以前のデスクトップ版にはプロフィールもログアウトも無く、どこにも辿り着けなかった）。
  // 言語とテーマカラーは設定にまとめた（以前はメニューと設定に分かれていた）
  const accountMenu = (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onClick={() => navigate("/me")}>
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
      <DropdownMenuItem onClick={() => navigate("/me?settings=1")}>
        <Settings className="w-4 h-4 mr-2" />
        {t("chrome.nav.settings")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate("/how-to-use")}>
        <HelpCircle className="w-4 h-4 mr-2" />
        {t("chrome.nav.howToUse")}
      </DropdownMenuItem>
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
        <Link to="/" className="logo-text text-xl font-bold mr-4 md:mr-8">
          Collectify
        </Link>
        
        {/* ナビゲーションメニュー。モバイルの下タブと同じ並び・同じ行き先にする。
            コレクション / 交換 / 追加 / みんな / マイページ */}
        {user && <NavigationMenu data-tour="nav-bar" className="mr-auto">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/collection" title={t("chrome.nav.collection")} aria-current={isNavActive("/collection", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), NAV_ITEM, isNavActive("/collection", location.pathname) && "bg-accent text-primary")}>
                  <Boxes className={NAV_ICON} />
                  <span className={NAV_LABEL}>{t("chrome.nav.collection")}</span>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/trade" title={t("chrome.nav.trade")} aria-current={isNavActive("/trade", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), NAV_ITEM, isNavActive("/trade", location.pathname) && "bg-accent text-primary")}>
                  <ArrowLeftRight className={NAV_ICON} />
                  <span className={NAV_LABEL}>{t("chrome.nav.trade")}</span>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                {/* 下タブ中央の追加ボタンに相当する入口。デスクトップには
                    下タブが無いので、ここが無いと常設の追加導線が消える。 */}
                <button
                  type="button"
                  data-tour="collection-add"
                  onClick={() => setIsAddGoodsOpen(true)}
                  title={t("chrome.nav.add")}
                  className={cn(navigationMenuTriggerStyle(), NAV_ITEM)}
                >
                  <Plus className={NAV_ICON} />
                  <span className={NAV_LABEL}>{t("chrome.nav.add")}</span>
                </button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/explore" title={t("chrome.nav.explore")} aria-current={isNavActive("/explore", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), NAV_ITEM, isNavActive("/explore", location.pathname) && "bg-accent text-primary")}>
                  <Compass className={NAV_ICON} />
                  <span className={NAV_LABEL}>{t("chrome.nav.explore")}</span>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/me" title={t("chrome.nav.myPage")} aria-current={isNavActive("/me", location.pathname) ? "page" : undefined} className={cn(navigationMenuTriggerStyle(), NAV_ITEM, isNavActive("/me", location.pathname) && "bg-accent text-primary")}>
                  <User className={NAV_ICON} />
                  <span className={NAV_LABEL}>{t("chrome.nav.myPage")}</span>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>}
        
        {/* 右側のアクション */}
        <div className="ml-auto flex shrink-0 items-center md:gap-1">
          {/* 名前は幅に余裕があるときだけ（狭いとボタンを押し出してしまう） */}
          <div className="mr-2 hidden xl:block"><UserInfo /></div>
          {user ? <>
              {/* ポイント残高。以前はモバイルのヘッダーにしか無く、PCでは残高が見えなかった。
                  モバイルと同じ見た目・同じ行き先（ポイントショップ） */}
              <PointsNavButton variant="icon" />
              
              {/* 右上の丸いボタンは、ほしいもの・交換・メッセージ・通知で形をそろえる。
                  以前はほしいもの・交換だけ枠付きの小さな四角（32px・アイコン16px）で、
                  隣のメッセージ・通知（枠なしの丸・40px・アイコン20px）と大きさも形も違っていた */}
              <Button variant="ghost" size="icon" onClick={() => setIsWishlistModalOpen(true)} className={HEADER_ICON_BUTTON} aria-label={t("chrome.nav.wishlist")} title={t("chrome.nav.wishlist")}>
                <ShoppingBasket />
              </Button>
              
              <TradeInboxButton className={HEADER_ICON_BUTTON} />
              <MessagesNavButton unreadCount={unreadMessages} />
              <NotificationBell className="hidden sm:inline-flex" />
              
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