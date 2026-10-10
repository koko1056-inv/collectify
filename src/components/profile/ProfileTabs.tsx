import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ProfileTabDef<T extends string> {
  id: T;
  /** 翻訳キー */
  labelKey: string;
  icon: LucideIcon;
}

/**
 * プロフィールのタブ（自分・他人で共通）。
 * アイコンと文字を縦に並べ、4つでも 390px 幅に収まるようにする。
 * 以前は自分のページでは選んでいないタブがアイコンだけ、他人のページでは文字がはみ出していた。
 */
export function ProfileTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ProfileTabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  const { t } = useLanguage();
  return (
    <div role="tablist" className="flex gap-1 rounded-2xl border border-border/30 bg-muted/60 p-1">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="max-w-full truncate text-2xs font-bold">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
