import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface FeedPostHeaderProps {
  post: any;
  userId?: string;
  onShare: () => void;
}

export function FeedPostHeader({ post, userId, onShare }: FeedPostHeaderProps) {
  const { toast } = useToast();

  const handleReport = () => {
    toast({
      title: "報告完了",
      description: "投稿を報告しました。ご協力ありがとうございます。",
    });
  };

  const handleHide = () => {
    toast({
      title: "非表示にしました",
      description: "この投稿は今後表示されません",
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link to={`/user/${post.user_id}`}>
          <Avatar>
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.display_name?.[0] || post.profiles?.username?.[0]}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link
            to={`/user/${post.user_id}`}
            className="font-medium hover:underline"
          >
            {post.profiles?.display_name || post.profiles?.username}
          </Link>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
              locale: ja,
            })}
          </p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">メニューを開く</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {userId === post.user_id ? (
            <>
              <DropdownMenuItem>編集</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">削除</DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={handleReport}>報告</DropdownMenuItem>
              <DropdownMenuItem onClick={handleHide}>非表示にする</DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={onShare}>共有</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}