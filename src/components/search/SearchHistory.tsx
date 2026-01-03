import { Clock, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchHistoryItem } from "@/hooks/useSearchHistory";

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onHistoryClick: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
  visible: boolean;
}

export function SearchHistory({
  history,
  onHistoryClick,
  onRemove,
  onClearAll,
  visible,
}: SearchHistoryProps) {
  if (!visible || history.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 mt-1 overflow-hidden animate-fade-in">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          最近の検索
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClearAll();
          }}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          クリア
        </Button>
      </div>

      {/* 履歴リスト */}
      <div className="max-h-48 overflow-y-auto">
        {history.map((item, index) => (
          <div
            key={`${item.query}-${index}`}
            className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 cursor-pointer group transition-colors"
            onClick={() => onHistoryClick(item.query)}
          >
            <Clock className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
            <span className="flex-1 text-sm text-foreground truncate">
              {item.query}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.query);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-muted transition-all"
              aria-label="削除"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
