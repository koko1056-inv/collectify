import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { NotificationList } from './NotificationList';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NavCountBadge } from '@/components/navigation/NavCountBadge';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();

  // メッセージの入口と同じ形（40pxの丸・アイコン20px）と同じバッジにそろえる。
  // 以前は未読があるとベルが揺れ続け（animate-wiggle）、赤いバッジも点滅していて、
  // ヘッダーの中でここだけ落ち着かなかった
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-10 w-10 rounded-full text-foreground hover:bg-muted hover:text-foreground [&_svg]:size-5", className)}
          aria-label={
            unreadCount > 0
              ? t("misc.notifications.bellUnread", { n: unreadCount })
              : t("misc.notifications.title")
          }
        >
          <Bell />
          <NavCountBadge count={unreadCount} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-80 w-[calc(100vw-2rem)] p-0 bg-background shadow-lg" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold">{t("misc.notifications.title")}</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t("misc.notifications.unreadCount", { n: unreadCount })}
            </Badge>
          )}
        </div>
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}