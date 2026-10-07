import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FacetKind } from "@/utils/itemFacets";
import {
  activeFilterCount,
  contentOptions,
  EMPTY_FILTER,
  facetOptions,
  type CatalogFilterState,
  type CatalogItemLike,
} from "@/utils/catalogFilter";

const KINDS: FacetKind[] = ["series", "character", "type", "source"];
const COLLAPSED = 14;

interface CatalogFilterPanelProps {
  items: CatalogItemLike[];
  owned?: Set<string>;
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
}

/**
 * カタログの一覧を絞り込む。作品 → シリーズ・キャラ・種類・入手方法 の順に狭められる。
 * チップの数字は「他の条件で絞った結果で、押すと何件になるか」。
 */
export function CatalogFilterPanel({ items, owned, value, onChange }: CatalogFilterPanelProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FacetKind>("series");
  const [expanded, setExpanded] = useState(false);

  const count = activeFilterCount(value);
  const contents = useMemo(() => contentOptions(items, value, owned), [items, value, owned]);
  const options = useMemo(() => facetOptions(items, value, kind, owned), [items, value, kind, owned]);
  const kindCounts = useMemo(
    () => Object.fromEntries(KINDS.map((k) => [k, facetOptions(items, value, k, owned).length])) as Record<FacetKind, number>,
    [items, value, owned]
  );
  const shown = expanded ? options : options.slice(0, COLLAPSED);

  const toggleTag = (k: FacetKind, v: string) => {
    const cur = value.selection[k] ?? [];
    const has = cur.some((x) => x.toLowerCase() === v.toLowerCase());
    const next = has ? cur.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...cur, v];
    onChange({ ...value, selection: { ...value.selection, [k]: next } });
  };

  const active: { key: string; label: string; remove: () => void }[] = [];
  if (value.content) active.push({ key: "content", label: value.content, remove: () => onChange({ ...value, content: null }) });
  for (const k of KINDS) for (const v of value.selection[k] ?? []) active.push({ key: `${k}:${v}`, label: v, remove: () => toggleTag(k, v) });
  if (value.hideOwned) active.push({ key: "owned", label: t("engage.catalog.onlyNotOwned"), remove: () => onChange({ ...value, hideOwned: false }) });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            open || count > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("engage.catalog.filter")}
          {count > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
              {count}
            </span>
          )}
        </button>
        {count > 0 && (
          <button type="button" onClick={() => onChange({ ...EMPTY_FILTER, query: value.query })} className="text-xs text-muted-foreground underline">
            {t("engage.catalog.clear")}
          </button>
        )}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {active.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.remove}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] text-primary-foreground"
              aria-label={`${a.label} ${t("engage.catalog.remove")}`}
            >
              <span className="truncate">{a.label}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="max-h-[34vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={value.hideOwned}
              onChange={(e) => onChange({ ...value, hideOwned: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            {t("engage.catalog.onlyNotOwned")}
          </label>

          {contents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">{t("engage.catalog.content")}</p>
              <div className="flex flex-wrap gap-1.5">
                {contents.map((c) => {
                  const on = value.content === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onChange({ ...value, content: on ? null : c.value })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      )}
                    >
                      <span className="max-w-[9rem] truncate">{c.value}</span>
                      <span className="tabular-nums text-[10px] opacity-70">{c.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex w-fit items-center gap-1 rounded-full bg-muted p-1" role="tablist">
              {KINDS.filter((k) => kindCounts[k] > 0 || (value.selection[k]?.length ?? 0) > 0).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => {
                    setKind(k);
                    setExpanded(false);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    kind === k ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {t(`engage.catalog.kind.${k}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {shown.map((o) => {
                const on = (value.selection[kind] ?? []).some((x) => x.toLowerCase() === o.value.toLowerCase());
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(kind, o.value)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                    )}
                  >
                    <span className="max-w-[9rem] truncate">{o.value}</span>
                    <span className="tabular-nums text-[10px] opacity-70">{o.count}</span>
                  </button>
                );
              })}
              {options.length > COLLAPSED && (
                <button type="button" onClick={() => setExpanded((v) => !v)} className="px-2 py-1 text-xs text-primary">
                  {expanded ? t("engage.collection.showLess") : t("engage.collection.showMore", { n: options.length - COLLAPSED })}
                </button>
              )}
              {options.length === 0 && <p className="text-xs text-muted-foreground">{t("engage.catalog.noOptions")}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
