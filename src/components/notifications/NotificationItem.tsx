import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Eye, Package, Info, AlertTriangle, CheckCircle, XCircle, MessageCircle, Heart, Reply, Sticker, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notification, NotificationData } from '@/types/notification';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { STAMP_BY_TYPE, type StampType } from '@/features/stamps/types';
import { useReplyStamp } from '@/features/stamps/useGreetingStamp';

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const replyStamp = useReplyStamp();

  const getIcon = () => {
    switch (notification.type) {
      case 'new_item':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-primary" />;
      case 'reply':
        return <Reply className="h-4 w-4 text-primary" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'greeting_stamp':
        return <Sticker className="h-4 w-4 text-pink-500" />;
      case 'match_success':
        return <Sparkles className="h-4 w-4 text-violet-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBadgeVariant = () => {
    switch (notification.type) {
      case 'new_item':
        return 'default' as const;
      case 'success':
        return 'default' as const;
      case 'warning':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'new_item' && notification.data.item_id) {
      navigate(`/search?item=${notification.data.item_id}`);
    } else if ((notification.type === 'comment' || notification.type === 'reply' || notification.type === 'like') && notification.data.post_id) {
      navigate(`/posts?post=${notification.data.post_id}`);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ja,
  });

  const data = notification.data as NotificationData;

  return (
    <div
      className={cn(
        "p-3 hover:bg-muted/50 cursor-pointer transition-colors min-h-[60px]",
        !notification.is_read && "bg-blue-50/50"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">
              {notification.title}
            </h4>
            {!notification.is_read && (
              <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
            )}
          </div>
          
          {notification.message && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {notification.message}
            </p>
          )}

          {/* Special rendering for new item notifications */}
          {notification.type === 'new_item' && data.image && (
            <div className="flex items-center gap-2 mb-2">
              <img
                src={data.image}
                alt={data.item_title}
                className="w-8 h-8 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{data.item_title}</p>
                {data.content_name && (
                  <p className="text-xs text-muted-foreground">{data.content_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Special rendering for comment/reply/like notifications */}
          {(notification.type === 'comment' || notification.type === 'reply' || notification.type === 'like') && data.image && (
            <div className="flex items-center gap-2 mb-2">
              <img
                src={data.image}
                alt="投稿画像"
                className="w-8 h-8 rounded object-cover"
              />
              {data.comment_text && (
                <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                  「{data.comment_text}」
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {timeAgo}
            </span>
            
            <div className="flex items-center gap-1">
              {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 touch-target"
                onClick={handleMarkAsRead}
                title="既読にする"
              >
                <Eye className="h-4 w-4" />
              </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 touch-target hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDelete}
                title="削除"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}