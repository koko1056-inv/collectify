import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useOwnedOfficialIds } from "@/hooks/useOwnedOfficialIds";
import { filterByYear, filterMissing, parseYearParam, yearBuckets, type YearBucket, type ZukanItemLike } from "@/utils/zukan";

/**
 * カタログ（/search）の図鑑表示の状態。URL に残すので、戻る・共有しても同じ見た目に戻る。
 *  - ?missing=1    未所持だけ（ログイン時のみ）
 *  - ?view=series  シリーズ別まとめ（作品を選んでいるときだけ。全件が手元にあるので正しく数えられる）
 *  - ?year=2024    発売年
 * 他の URL パラメータ（item・作品・タグなど）には触らない。
 */
export function useZukanView<T extends ZukanItemLike>(items: T[], activeContent: string | null) {
  const [params, setParams] = useSearchParams();
  const { ownedIds, isGuest, dataUpdatedAt } = useOwnedOfficialIds();

  const year = parseYearParam(params.get("year"));
  const missingOnly = !isGuest && params.get("missing") === "1";
  const seriesView = !!activeContent && params.get("view") === "series";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setYear = useCallback((y: number | null) => setParam("year", y === null ? null : String(y)), [setParam]);
  const setMissingOnly = useCallback((on: boolean) => setParam("missing", on ? "1" : null), [setParam]);
  const setSeriesView = useCallback((on: boolean) => setParam("view", on ? "series" : null), [setParam]);
  // 絞り込みのリセット用。未所持だけ・発売年をまとめて外す（見た目の view はそのまま）。
  // setParam を2回呼ぶと先の変更が後の呼び出しで上書きされるので、1回で消す
  const clearFilters = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("missing");
        next.delete("year");
        return next;
      },
      { replace: true }
    );
  }, [setParams]);

  // 「未所持だけ」は所持 id が届くまで絞らない（一瞬ぜんぶ消えて見えないように）
  const missingApplied = useMemo(
    () => (missingOnly && ownedIds ? filterMissing(items, ownedIds) : items),
    [items, missingOnly, ownedIds]
  );

  const years: YearBucket[] = useMemo(() => {
    const buckets = yearBuckets(missingApplied);
    // 作品を切り替えて選んだ年が無くなっても、チップを残して外せるようにする
    if (year !== null && !buckets.some((b) => b.year === year)) {
      return [...buckets, { year, count: 0 }].sort((a, b) => b.year - a.year);
    }
    return buckets;
  }, [missingApplied, year]);

  const visibleItems = useMemo(() => filterByYear(missingApplied, year), [missingApplied, year]);

  return {
    items: visibleItems,
    years,
    year,
    setYear,
    missingOnly,
    setMissingOnly,
    seriesView,
    setSeriesView,
    clearFilters,
    ownedIds,
    ownedUpdatedAt: dataUpdatedAt,
    isGuest,
  };
}

export type ZukanViewState = ReturnType<typeof useZukanView>;
