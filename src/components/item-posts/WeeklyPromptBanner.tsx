import { Hash } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getWeeklyPrompt } from "@/utils/weeklyPrompt";

interface WeeklyPromptBannerProps {
  onPost: (tag: string) => void;
  onBrowse: (tag: string) => void;
}

/**
 * 今週のお題は主役にしない。投稿の主役は「自分のグッズ」で、お題は迷ったときの手がかり。
 * 1行の控えめな帯にして、タグを押すとその投稿を見られ、「投稿」で同じタグ付きの作成画面へ進む。
 */
export function WeeklyPromptBanner({ onPost, onBrowse }: WeeklyPromptBannerProps) {
  const { t } = useLanguage();
  const prompt = getWeeklyPrompt();

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs"
      data-tour="post-prompt"
    >
      <span className="shrink-0 text-muted-foreground">{t("engage.posts.promptLabel")}</span>
      <button
        type="button"
        onClick={() => onBrowse(prompt.tag)}
        className="inline-flex min-w-0 items-center font-bold text-primary hover:underline"
        title={t(`engage.prompts.${prompt.id}`)}
      >
        <Hash className="h-3 w-3 shrink-0" />
        <span className="truncate">{prompt.tag}</span>
      </button>
      <button
        type="button"
        onClick={() => onPost(prompt.tag)}
        className="ml-auto shrink-0 rounded-full border border-primary/30 px-2.5 py-1 font-medium text-primary hover:bg-primary/10"
      >
        {t("engage.posts.promptPost")}
      </button>
    </div>
  );
}
