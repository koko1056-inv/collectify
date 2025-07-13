import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserInfo } from "./UserInfo";
import { ShoppingBasket, UserSearch, User, Home, Search, FileText, FolderOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { UserSearchModal } from "./UserSearchModal";
import { TradeRequestsModal } from "./trade/TradeRequestsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatButton } from "./ChatButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "ホーム", url: "/", icon: Home },
  { title: "検索", url: "/search", icon: Search },
  { title: "コレクション", url: "/collection", icon: FolderOpen },
  { title: "投稿", url: "/posts", icon: FileText },
];

export function AppSidebar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
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
    const { count, error } = await supabase
      .from("trade_requests")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (!error && count !== null) {
      setPendingTradeRequests(count);
    }
  };

  const subscribeToTradeRequests = () => {
    const channel = supabase
      .channel("trade-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_requests",
          filter: `receiver_id=eq.${user?.id}`,
        },
        () => {
          fetchPendingTradeRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "ログアウトに失敗しました",
      });
    } else {
      toast({
        title: "ログアウト完了",
        description: "ログアウトしました",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
        <SidebarHeader className="p-4">
          <Link to="/" className="logo-text text-xl font-bold">
            {!collapsed && "Collectify"}
            {collapsed && "C"}
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {user && (
            <SidebarGroup>
              <SidebarGroupLabel>{!collapsed && "メニュー"}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.url}
                          className={cn(
                            "flex items-center w-full",
                            isActive(item.url) && "bg-accent text-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="ml-2">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {user && (
            <SidebarGroup>
              <SidebarGroupLabel>{!collapsed && "アクション"}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => setIsSearchModalOpen(true)}
                        className="flex items-center w-full"
                      >
                        <UserSearch className="h-4 w-4" />
                        {!collapsed && <span className="ml-2">ユーザー検索</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => setIsWishlistModalOpen(true)}
                        className="flex items-center w-full"
                      >
                        <ShoppingBasket className="h-4 w-4" />
                        {!collapsed && <span className="ml-2">ウィッシュリスト</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="p-4">
          {user ? (
            <div className="space-y-2">
              {!collapsed && <UserInfo />}
              <div className="flex items-center gap-2">
                <ChatButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/edit-profile">{t("nav.profile")}</Link>
                    </DropdownMenuItem>
                    {user.email === "admin@example.com" && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">{t("nav.admin")}</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      {t("nav.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="outline" className="w-full">
                {t("nav.login")}
              </Button>
            </Link>
          )}
        </SidebarFooter>
      </Sidebar>

      <WishlistViewModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
      <TradeRequestsModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
      />
    </>
  );
}