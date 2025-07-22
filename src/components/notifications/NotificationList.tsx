import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';
import { Loader2 } from 'lucide-react';

export function NotificationList() {
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
      <div className="p-8 text-center text-muted-foreground">
        <p>通知はありません</p>
      </div>
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
                更新中...
              </>
            ) : (
              'すべて既読にする'
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