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
import { supabase } from "@/integrations/supabase/client";

interface FeedPostHeaderProps {
  post: any;
  userId?: string;
  onShare: () => void;
  onEdit: () => void;
}

export function FeedPostHeader({ post, userId, onShare, onEdit }: FeedPostHeaderProps) {
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

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("user_items")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast({
        title: "削除完了",
        description: "投稿を削除しました",
      });

      // ページをリロードして最新の状態を反映
      window.location.reload();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "エラー",
        description: "投稿の削除に失敗しました",
        variant: "destructive",
      });
    }
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
              <DropdownMenuItem onClick={onEdit}>編集</DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600"
              >
                削除
              </DropdownMenuItem>
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