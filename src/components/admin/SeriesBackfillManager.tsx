import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * 作品情報が無いグッズに、AIで作品名を推定して紐づける。
 *
 * 交換の相手探しは作品名で寄せているので、作品が分からないグッズは
 * 何をしても候補に出てこない。ここで埋める。
 *
 * 推定しただけでは何も書き換わらない。中身を見て、チェックを入れた分
 * だけが反映される。名前はその場で直せる。
 * タグは作らない（タグ作成は利用者の確認を取る運用のため）。
 */

interface Candidate {
  id: string;
  kind: "user_item" | "official_item";
  title: string;
  suggestion: string | null;
  isNew: boolean;
  confidence: number;
}

/** これ未満の確信度は、既定でチェックを外しておく。 */
const AUTO_SELECT_CONFIDENCE = 0.7;

export function SeriesBackfillManager() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const nameFor = (c: Candidate) => edited[c.id] ?? c.suggestion ?? "";

  const runPreview = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-item-series", {
        body: { mode: "preview", limit: 40 },
      });
      if (error) throw error;

      const rows: Candidate[] = data?.candidates ?? [];
      setCandidates(rows);
      setRemaining(typeof data?.remaining === "number" ? data.remaining : null);
      setEdited({});
      // 自信のあるものだけ最初からチェックしておく。
      // 全部チェックで出すと、見ずに反映されてしまう。
      setSelected(
        Object.fromEntries(
          rows.map((c) => [c.id, !!c.suggestion && c.confidence >= AUTO_SELECT_CONFIDENCE])
        )
      );
    } catch (e) {
      console.error("[SeriesBackfill] preview failed:", e);
      toast.error(t("screens.admin.seriesBackfill.previewFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const apply = async () => {
    if (!candidates) return;
    const updates = candidates
      .filter((c) => selected[c.id] && nameFor(c).trim())
      .map((c) => ({ id: c.id, kind: c.kind, contentName: nameFor(c).trim() }));

    if (updates.length === 0) {
      toast.error(t("screens.admin.seriesBackfill.nothingSelected"));
      return;
    }

    setIsApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-item-series", {
        body: { mode: "apply", updates },
      });
      if (error) throw error;

      const applied = data?.applied ?? 0;
      const failed = (data?.failures ?? []).length;
      toast.success(t("screens.admin.seriesBackfill.applied", { n: applied }), {
        description: failed > 0
          ? t("screens.admin.seriesBackfill.appliedWithFailures", { n: failed })
          : undefined,
      });

      // 反映済みの行を一覧から消す
      const appliedIds = new Set(updates.map((u) => u.id));
      setCandidates(candidates.filter((c) => !appliedIds.has(c.id)));
      setRemaining(typeof data?.remaining === "number" ? data.remaining : remaining);

      // 交換の候補は作品名で寄せているので、ここで作り直させる
      queryClient.invalidateQueries({ queryKey: ["trade-series-partners"] });
      queryClient.invalidateQueries({ queryKey: ["trade-matches"] });
    } catch (e) {
      console.error("[SeriesBackfill] apply failed:", e);
      toast.error(t("screens.admin.seriesBackfill.applyFailed"));
    } finally {
      setIsApplying(false);
    }
  };

  const selectedCount = candidates
    ? candidates.filter((c) => selected[c.id] && nameFor(c).trim()).length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" />
          {t("screens.admin.seriesBackfill.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("screens.admin.seriesBackfill.description")}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runPreview} disabled={isLoading || isApplying} className="gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t("screens.admin.seriesBackfill.runPreview")}
          </Button>
          {remaining !== null && (
            <span className="text-sm text-muted-foreground">
              {t("screens.admin.seriesBackfill.remaining", { n: remaining })}
            </span>
          )}
        </div>

        {candidates && candidates.length === 0 && (
          <EmptyState
            className="py-8"
            icon={Wand2}
            title={t("screens.admin.seriesBackfill.empty")}
            description={t("screens.admin.seriesBackfill.emptyDesc")}
          />
        )}

        {candidates && candidates.length > 0 && (
          <>
            <div className="space-y-2">
              {candidates.map((c) => {
                const low = c.confidence < AUTO_SELECT_CONFIDENCE;
                return (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <Checkbox
                      checked={!!selected[c.id]}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({ ...prev, [c.id]: v === true }))
                      }
                      disabled={!nameFor(c).trim()}
                      className="mt-1"
                      aria-label={c.title}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium break-words">{c.title}</p>
                        <Badge variant="outline" className="shrink-0 text-3xs">
                          {c.kind === "official_item"
                            ? t("screens.admin.seriesBackfill.kindOfficial")
                            : t("screens.admin.seriesBackfill.kindUser")}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={nameFor(c)}
                          onChange={(e) =>
                            setEdited((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          placeholder={t("screens.admin.seriesBackfill.unknown")}
                          className="h-9 max-w-xs"
                        />
                        {c.isNew && nameFor(c).trim() && (
                          <Badge className="bg-warning-soft text-warning text-3xs">
                            {t("screens.admin.seriesBackfill.newName")}
                          </Badge>
                        )}
                        <span
                          className={
                            low
                              ? "text-2xs text-warning"
                              : "text-2xs text-muted-foreground"
                          }
                        >
                          {t("screens.admin.seriesBackfill.confidence", {
                            n: Math.round(c.confidence * 100),
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <Button onClick={apply} disabled={isApplying || selectedCount === 0} className="gap-2">
                {isApplying && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("screens.admin.seriesBackfill.apply", { n: selectedCount })}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("screens.admin.seriesBackfill.applyNote")}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
