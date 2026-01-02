import { ImagePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmptyPostsStateProps {
  hasFilters?: boolean;
  onCreatePost?: () => void;
}

export function EmptyPostsState({ hasFilters, onCreatePost }: EmptyPostsStateProps) {
  const { t } = useLanguage();

  if (hasFilters) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">条件に一致する投稿がありません</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          フィルターを変更するか、検索条件を見直してみてください
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">みんなの投稿を見てみよう</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        まだ投稿がありません。<br />
        あなたのコレクションを最初にシェアしてみませんか？
      </p>
      {onCreatePost && (
        <Button onClick={onCreatePost} className="gap-2">
          <ImagePlus className="w-4 h-4" />
          最初の投稿を作成する
        </Button>
      )}
    </div>
  );
}
