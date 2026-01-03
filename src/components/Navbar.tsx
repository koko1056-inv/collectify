import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserInfo } from "./UserInfo";
import { ShoppingBasket, User, Search, FileText, FolderOpen, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { UserSearchModal } from "./UserSearchModal";
import { TradeRequestsModal } from "./trade/TradeRequestsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatButton } from "./ChatButton";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notifications/NotificationBell";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { PointsNavButton } from "./shop/PointsNavButton";
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
    toast
  } = useToast();
  const {
    t,
    language,
    setLanguage
  } = useLanguage();
  const navigate = useNavigate();
  const {
    profile
  } = useProfile(user?.id);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [pendingTradeRequests, setPendingTradeRequests] = useState(0);
  useEffect(() => {
    if (user) {
      fetchPendingTradeRequests();
      subscribeToTradeRequests();
    }
  }, [user]);
  const fetchPendingTradeRequests = async () => {
    if (!user) return;
    const {
      count,
      error
    } = await supabase.from("trade_requests").select("*", {
      count: "exact",
      head: true
    }).eq("receiver_id", user.id).eq("status", "pending");
    if (!error && count !== null) {
      setPendingTradeRequests(count);
    }
  };
  const subscribeToTradeRequests = () => {
    const channel = supabase.channel("trade-requests").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "trade_requests",
      filter: `receiver_id=eq.${user?.id}`
    }, () => {
      fetchPendingTradeRequests();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  };
  const handleLogout = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "ログアウトに失敗しました"
      });
    } else {
      toast({
        title: "ログアウト完了",
        description: "ログアウトしました"
      });
    }
  };
  return <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-sm">
      {/* モバイル版のロゴ (sm未満でのみ表示) */}
      <div className="flex sm:hidden items-center h-12 bg-background border-b px-4">
        <div className="w-20 flex-shrink-0" /> {/* Left spacer for balance */}
        <Link to="/my-room" className="logo-text text-xl font-bold flex-1 text-center">
          Collectify
        </Link>
        <div className="w-20 flex-shrink-0 flex justify-end">
          {user && <div className="flex items-center gap-2">
              <NotificationBell className="sm:hidden" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center">
                    <Avatar className="w-8 h-8 border-2 border-border hover:border-primary transition-colors">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/edit-profile")}>
                    <User className="w-4 h-4 mr-2" />
                    プロフィール
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    言語 / Language
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setLanguage("ja")} className={language === "ja" ? "bg-accent" : ""}>
                    🇯🇵 日本語
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-accent" : ""}>
                    🇺🇸 English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>}
        </div>
      </div>
      
      {/* デスクトップ版のナビゲーション */}
      <div className="hidden sm:flex h-16 items-center px-4 container mx-auto">
        <Link to="/" className="logo-text text-xl font-bold mr-8">
          Collectify
        </Link>
        
        {/* ナビゲーションメニュー */}
        {user && <NavigationMenu className="mr-auto">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/search" className={cn(navigationMenuTriggerStyle())}>
                  <Search className="h-4 w-4 mr-2" />
                  {t("nav.searchNav")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/collection" className={cn(navigationMenuTriggerStyle())}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {t("nav.collection")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/my-room" className={cn(navigationMenuTriggerStyle())}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {t("nav.myRoom")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/posts" className={cn(navigationMenuTriggerStyle())}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("nav.community")}
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>}
        
        {/* 右側のアクション */}
        <div className="ml-auto flex items-center gap-4">
          <UserInfo />
          {user ? <>
              <PointsNavButton />
              <Button variant="outline" size="icon" onClick={() => setIsWishlistModalOpen(true)} className="relative h-8 w-8">
                <ShoppingBasket className="h-4 w-4 text-foreground" />
              </Button>
              
              <ChatButton />
              <NotificationBell className="hidden sm:block" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity">
                    <Avatar className="w-8 h-8 border-2 border-border hover:border-primary transition-colors">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/edit-profile")}>
                    <User className="w-4 h-4 mr-2" />
                    プロフィール
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    言語 / Language
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setLanguage("ja")} className={language === "ja" ? "bg-accent" : ""}>
                    🇯🇵 日本語
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-accent" : ""}>
                    🇺🇸 English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
            </> : <Link to="/login">
              <Button variant="outline" className="text-sm">
                {t("nav.login")}
              </Button>
            </Link>}
        </div>
      </div>
      
      <WishlistViewModal isOpen={isWishlistModalOpen} onClose={() => setIsWishlistModalOpen(false)} />
      <UserSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
      <TradeRequestsModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} />
    </nav>;
}