import { ImagePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState } from "@/components/ui/empty-state";

interface EmptyPostsStateProps {
  hasFilters?: boolean;
  onCreatePost?: () => void;
}

export function EmptyPostsState({ hasFilters, onCreatePost }: EmptyPostsStateProps) {
  const { t } = useLanguage();

  if (hasFilters) {
    return (
      <EmptyState
        icon={ImagePlus}
        title={t("social.posts.emptyFilteredTitle")}
        description={t("social.posts.emptyFilteredDesc")}
        className="py-16"
      />
    );
  }

  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">{t("social.posts.emptyTitle")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        {t("social.posts.emptyDescLine1")}<br />
        {t("social.posts.emptyDescLine2")}
      </p>
      {onCreatePost && (
        <Button onClick={onCreatePost} className="gap-2">
          <ImagePlus className="w-4 h-4" />
          {t("social.posts.emptyCta")}
        </Button>
      )}
    </div>
  );
}
