import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface CardActionsProps {
  onMemoriesClick: () => void;
  onTagManageClick?: () => void;
  onDeleteClick: () => void;
  onCreatePostClick: () => void;
  hasMemories: boolean;
  hasTags?: boolean;
  tagCount?: number;
}

export function CardActions({
  onMemoriesClick,
  onDeleteClick,
  onCreatePostClick,
  hasMemories,
}: CardActionsProps) {
  const { t } = useLanguage();
  const stop =
    (fn: () => void) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fn();
    };

  return (
    <div className="flex items-center justify-center gap-2 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={stop(onMemoriesClick)}
        className={cn(
          "h-7 w-7 p-0 rounded-full transition-colors",
          hasMemories
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
        )}
        title={t("collectionScreen.cardActions.memories")}
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={stop(onCreatePostClick)}
        className="h-7 w-7 p-0 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted"
        title={t("collectionScreen.cardActions.createPost")}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={stop(onDeleteClick)}
        className="h-7 w-7 p-0 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
        title={t("collectionScreen.cardActions.delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
