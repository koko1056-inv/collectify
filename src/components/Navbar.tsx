import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserInfo } from "./UserInfo";
import { ShoppingBasket, UserSearch, User, Repeat2 } from "lucide-react";
import { useState, useEffect } from "react";
import { WishlistViewModal } from "./WishlistViewModal";
import { UserSearchModal } from "./UserSearchModal";
import { TradeRequestsModal } from "./trade/TradeRequestsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Navbar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="hidden sm:flex h-14 sm:h-16 items-center px-2 sm:px-4 sm:container sm:mx-auto">
        <Link to="/" className="logo-text">
          Collectify
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <UserInfo />
          {user ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsSearchModalOpen(true)}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <UserSearch className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("nav.search.user")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsWishlistModalOpen(true)}
                className="relative h-8 w-8 sm:h-9 sm:w-9"
              >
                <ShoppingBasket className="h-4 w-4 text-foreground" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsTradeModalOpen(true)}
                className="relative h-8 w-8 sm:h-9 sm:w-9"
              >
                <Repeat2 className="h-4 w-4 text-foreground" />
                {pendingTradeRequests > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingTradeRequests}
                  </span>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
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
            </>
          ) : (
            <Link to="/login">
              <Button variant="outline" className="text-sm">
                {t("nav.login")}
              </Button>
            </Link>
          )}
        </div>
      </div>
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
    </nav>
  );
}