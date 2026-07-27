import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader2 } from 'lucide-react';

export function NotificationList() {
  const { t } = useLanguage();
  const {
    notifications,
    isLoading,
    unreadCount,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState title={t("misc.notifications.empty")} className="py-8" />
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="p-3 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
            className="w-full text-xs"
          >
            {isMarkingAllAsRead ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {t("misc.common.updating")}
              </>
            ) : (
              t("misc.notifications.markAllRead")
            )}
          </Button>
        </div>
      )}
      
      <ScrollArea className="max-h-80">
        <div className="divide-y">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}