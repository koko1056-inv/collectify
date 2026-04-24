import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useItemComments, useCreateItemComment } from "./useItemComments";
import { CommentItem } from "./CommentItem";

interface ItemCommentsSectionProps {
  officialItemId: string;
}

/**
 * official_item に紐づくコメント一覧 + 投稿フォーム。
 * グッズ詳細モーダルの「コメント」タブに埋め込む。
 */
export function ItemCommentsSection({ officialItemId }: ItemCommentsSectionProps) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useItemComments(officialItemId);
  const createMut = useCreateItemComment(officialItemId);
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await createMut.mutateAsync({ content: text });
    setText("");
  };

  return (
    <div className="space-y-4">
      {/* 投稿フォーム */}
      {user ? (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="このグッズについて感想・情報をシェア..."
            className="min-h-[80px] text-sm"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {text.length}/1000
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMut.isPending || !text.trim()}
            >
              {createMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "投稿する"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          コメントするにはログインしてください
        </p>
      )}

      <div className="border-t border-border" />

      {/* コメント一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">まだコメントはありません</p>
          <p className="text-xs mt-1">最初のコメントを投稿しましょう</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} officialItemId={officialItemId} />
          ))}
        </div>
      )}
    </div>
  );
}
