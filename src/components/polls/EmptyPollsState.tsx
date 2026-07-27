import { Vote, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmptyPollsStateProps {
  onCreatePoll?: () => void;
}

export function EmptyPollsState({ onCreatePoll }: EmptyPollsStateProps) {
  const { t } = useLanguage();

  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <Vote className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">{t("social.polls.emptyTitle")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        {t("social.polls.emptyDescLine1")}<br />
        {t("social.polls.emptyDescLine2")}
      </p>
      {onCreatePoll && (
        <Button onClick={onCreatePoll} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {t("social.polls.emptyCta")}
        </Button>
      )}
    </div>
  );
}
