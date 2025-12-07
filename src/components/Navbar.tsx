import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserInfo } from "./UserInfo";
import { ShoppingBasket, UserSearch, User, Repeat2, Home, Search, FileText, FolderOpen, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { UserSearchModal } from "./UserSearchModal";
import { TradeRequestsModal } from "./trade/TradeRequestsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatButton } from "./ChatButton";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notifications/NotificationBell";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
export function Navbar() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    t
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
  return <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      {/* モバイル版のロゴ (sm未満でのみ表示) */}
      <div className="flex sm:hidden justify-between items-center h-12 bg-white border-b px-4">
        <div className="w-8" /> {/* Left spacer for balance */}
        <Link to="/" className="logo-text text-xl font-bold">
          Collectify
        </Link>
        {user && <div className="flex items-center gap-2">
            <NotificationBell className="sm:hidden" />
            <button onClick={() => navigate("/edit-profile")} className="flex items-center justify-center">
              <Avatar className="w-8 h-8 border-2 border-border hover:border-primary transition-colors">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            </button>
          </div>}
        {!user && <div className="w-8" />} {/* Right spacer when not logged in */}
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
                <Link to="/" className={cn(navigationMenuTriggerStyle())}>
                  <Home className="h-4 w-4 mr-2" />
                  ホーム
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/search" className={cn(navigationMenuTriggerStyle())}>
                  <Search className="h-4 w-4 mr-2" />
                  検索
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/collection" className={cn(navigationMenuTriggerStyle())}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  コレクション
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("nav.search.user")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="icon" onClick={() => setIsWishlistModalOpen(true)} className="relative h-9 w-9">
                <ShoppingBasket className="h-4 w-4 text-foreground" />
              </Button>
              
              <ChatButton />
              <NotificationBell className="hidden sm:block" />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="icon" className="h-9 w-9">
                      <Link to="/add-item">
                        <Plus className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>グッズを追加</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => navigate("/edit-profile")} className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity">
                      <Avatar className="w-9 h-9 border-2 border-border hover:border-primary transition-colors">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>プロフィール</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/edit-profile">{t("nav.profile")}</Link>
                  </DropdownMenuItem>
                  {user.email === "admin@example.com" && <DropdownMenuItem asChild>
                      <Link to="/admin">{t("nav.admin")}</Link>
                    </DropdownMenuItem>}
                  <DropdownMenuItem onClick={handleLogout}>
                    {t("nav.logout")}
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