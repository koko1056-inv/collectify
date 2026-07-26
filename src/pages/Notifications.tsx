import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2, Bell, CheckCheck, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Notifications() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className={`container mx-auto ${isMobile ? 'pt-4 pb-20 px-2' : 'pt-6 pb-8 px-4'}`}>
        <div className={`${isMobile ? '' : 'max-w-4xl mx-auto'} space-y-6`}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6" />
              <h1 className="text-2xl font-bold">{t("screens.notifications.title")}</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {t("screens.notifications.unreadBadge", { count: unreadCount })}
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
              >
                {isMarkingAllAsRead ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {t("screens.notifications.marking")}
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4 mr-1" />
                    {t("screens.notifications.markAllRead")}
                  </>
                )}
              </Button>
            )}
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center p-8">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">{t("screens.notifications.emptyTitle")}</h3>
                <p className="text-muted-foreground">
                  {t("screens.notifications.emptyDesc")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* 未読通知 */}
              {unreadNotifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                      {t("screens.notifications.unreadSection", { count: unreadNotifications.length })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {unreadNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 既読通知 */}
              {readNotifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                      {t("screens.notifications.readSection", { count: readNotifications.length })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {readNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}