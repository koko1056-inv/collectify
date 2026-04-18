import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardActionsProps {
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onDeleteClick: () => void;
  onCreatePostClick: () => void;
  hasMemories: boolean;
  hasTags: boolean;
  tagCount?: number;
}

export function CardActions({
  onMemoriesClick,
  onTagManageClick,
  onDeleteClick,
  onCreatePostClick,
  hasMemories,
  hasTags,
  tagCount = 0,
}: CardActionsProps) {
  const stop =
    (fn: () => void) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fn();
    };

  return (
    <div className="flex items-center justify-between w-full gap-0.5">
      {/* 左側: タグ表示 */}
      <button
        onClick={stop(onTagManageClick)}
        className={cn(
          "flex items-center gap-1 px-1.5 h-7 rounded-md text-[10px] font-medium transition-colors min-w-0",
          hasTags
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
        )}
        title="タグを編集"
      >
        <Tag className="h-3 w-3 shrink-0" />
        <span className="truncate">{hasTags ? tagCount : "タグ"}</span>
      </button>

      {/* 右側: 統一されたアクションボタン */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={stop(onMemoriesClick)}
          className={cn(
            "h-7 w-7 p-0 rounded-md transition-colors",
            hasMemories
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
          )}
          title="思い出"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={stop(onCreatePostClick)}
          className="h-7 w-7 p-0 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted"
          title="投稿を作成"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={stop(onDeleteClick)}
          className="h-7 w-7 p-0 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
          title="削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
