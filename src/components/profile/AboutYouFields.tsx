import { useId, type ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AGE_RANGES,
  GENDERS,
  GOODS_TYPES,
  MONTHLY_BUDGETS,
  OSHI_YEARS,
  PREFECTURES,
  TRADE_FREQUENCIES,
  toggleMulti,
  toggleSingle,
  type ProfileExtras,
} from "@/lib/profileExtras";

/**
 * 「あなたのこと」の質問（タップで選ぶチップ＋都道府県のセレクト）。
 * ウェルカムのステップ・すでに使っている人への案内・設定の3か所で同じものを使う。
 * どれも任意。選んだチップをもう一度押すと外れる（答えないに戻せる）。
 */
export function AboutYouFields({
  value,
  onChange,
  className,
}: {
  value: ProfileExtras;
  onChange: (next: ProfileExtras) => void;
  className?: string;
}) {
  const { t, language } = useLanguage();
  const set = <K extends keyof ProfileExtras>(key: K, v: ProfileExtras[K]) => onChange({ ...value, [key]: v });
  const prefId = useId();

  return (
    <div className={cn("space-y-4", className)}>
      <FieldCard title={t("aboutYou.sectionYou")}>
        <ChipGroup label={t("aboutYou.gender.label")}>
          {GENDERS.map((g) => (
            <Chip key={g} active={value.gender === g} onClick={() => set("gender", toggleSingle(value.gender, g))}>
              {t(`aboutYou.gender.${g}`)}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label={t("aboutYou.age.label")}>
          {AGE_RANGES.map((a) => (
            <Chip key={a} active={value.age_range === a} onClick={() => set("age_range", toggleSingle(value.age_range, a))}>
              {t(`aboutYou.age.${a}`)}
            </Chip>
          ))}
        </ChipGroup>
        <div>
          <label htmlFor={prefId} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            {t("aboutYou.prefecture.label")}
            <span className="font-normal">（{t("aboutYou.prefecture.optional")}）</span>
          </label>
          {/* ネイティブのセレクト: スマホでは端末のピッカーで選べて、全画面のウェルカムの上でも隠れない */}
          <select
            id={prefId}
            value={value.prefecture ?? ""}
            onChange={(e) => set("prefecture", e.target.value || null)}
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t("aboutYou.prefecture.none")}</option>
            {PREFECTURES.map((p) => (
              <option key={p.code} value={p.code}>
                {language === "en" ? p.en : p.ja}
              </option>
            ))}
          </select>
        </div>
      </FieldCard>

      <FieldCard title={t("aboutYou.sectionOshi")}>
        <ChipGroup label={t("aboutYou.oshiYears.label")}>
          {OSHI_YEARS.map((y) => (
            <Chip key={y} active={value.oshi_years === y} onClick={() => set("oshi_years", toggleSingle(value.oshi_years, y))}>
              {t(`aboutYou.oshiYears.${y}`)}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label={t("aboutYou.budget.label")}>
          {MONTHLY_BUDGETS.map((b) => (
            <Chip
              key={b}
              active={value.monthly_budget === b}
              onClick={() => set("monthly_budget", toggleSingle(value.monthly_budget, b))}
            >
              {t(`aboutYou.budget.${b}`)}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label={t("aboutYou.goodsTypes.label")} hint={t("aboutYou.goodsTypes.hint")}>
          {GOODS_TYPES.map((g) => {
            const active = value.goods_types.includes(g);
            return (
              <Chip key={g} active={active} multi onClick={() => set("goods_types", toggleMulti(value.goods_types, g))}>
                {t(`aboutYou.goodsTypes.${g}`)}
              </Chip>
            );
          })}
        </ChipGroup>
        <ChipGroup label={t("aboutYou.trade.label")}>
          {TRADE_FREQUENCIES.map((f) => (
            <Chip
              key={f}
              active={value.trade_frequency === f}
              onClick={() => set("trade_frequency", toggleSingle(value.trade_frequency, f))}
            >
              {t(`aboutYou.trade.${f}`)}
            </Chip>
          ))}
        </ChipGroup>
      </FieldCard>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t("aboutYou.privacy")}
      </p>
    </div>
  );
}

function FieldCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

function ChipGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="text-xs font-bold text-muted-foreground">
        {label}
        {hint && <span className="ml-1 font-normal">（{hint}）</span>}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  multi = false,
  onClick,
  children,
}: {
  active: boolean;
  /** 複数選べるチップ（選ぶとチェックが付く） */
  multi?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 font-bold text-primary"
          : "border-border bg-background text-foreground hover:bg-accent"
      )}
    >
      {multi && active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </button>
  );
}
