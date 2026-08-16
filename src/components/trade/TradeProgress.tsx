import { Check, Package, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TradeViewpoint } from "./types";

/**
 * いま取引がどこまで進んでいるかを、自分の側と相手の側に分けて見せる。
 *
 * ひとつの帯にまとめると「発送済み」が誰の発送なのか分からない。
 * 送ったのに相手が送っていない、という一番もめやすい状態こそ
 * はっきり見えていてほしいので、2行に分ける。
 */
export function TradeProgress({ view }: { view: TradeViewpoint }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5">
      <ProgressRow
        label={t("trade.progress.you")}
        shipped={view.iShipped}
        received={view.partnerReceived}
        receivedLabel={t("trade.progress.partnerGotIt")}
      />
      <ProgressRow
        label={t("trade.progress.partner")}
        shipped={view.partnerShipped}
        received={view.iReceived}
        receivedLabel={t("trade.progress.youGotIt")}
      />
    </div>
  );
}

function ProgressRow({
  label,
  shipped,
  received,
  receivedLabel,
}: {
  label: string;
  shipped: boolean;
  received: boolean;
  receivedLabel: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 shrink-0 text-muted-foreground">{label}</span>
      <Step
        icon={Package}
        label={t("trade.progress.shipped")}
        done={shipped}
      />
      <span
        className={cn("h-px flex-1", received ? "bg-primary" : "bg-border")}
        aria-hidden
      />
      <Step icon={Truck} label={receivedLabel} done={received} />
    </div>
  );
}

function Step({
  icon: Icon,
  label,
  done,
}: {
  icon: typeof Package;
  label: string;
  done: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        done ? "bg-primary/15 text-primary" : "bg-background text-muted-foreground"
      )}
    >
      {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
