import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export interface DidYouMeanOption {
  key: string;
  /** 候補の名前 */
  label: string;
  /** 入力と名前が違うときの補足（例: 一番近かった別名） */
  hint?: string;
}

interface DidYouMeanProps {
  options: DidYouMeanOption[];
  onPick: (key: string) => void;
  className?: string;
}

/** 「もしかして: ○○」。入力に近い候補を、タップで選べるチップで見せる。 */
export function DidYouMean({ options, onPick, className }: DidYouMeanProps) {
  const { t } = useLanguage();
  if (options.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)} role="group" aria-label={t("engage.didYouMean.title")}>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {t("engage.didYouMean.title")}
      </span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="truncate">{o.label}</span>
          {o.hint && <span className="truncate text-3xs text-muted-foreground">（{o.hint}）</span>}
        </button>
      ))}
    </div>
  );
}
