/**
 * カタログ一覧の keyset（カーソル）ページ送り。サーバー側は supabase/migrations/20261028030000_catalog_keyset_paging.sql の
 * catalog_items_after / catalog_page_cursors。
 *
 * 並びは release_date desc, created_at desc, id asc（id まで入れた全順序）。
 * 「何件目から」（OFFSET）ではなく「前のページの最後の 1 件の次から」読むので、何ページ目でも同じ重さになる。
 * ここは Supabase を知らない（読み込みの関数を受け取る）ので、scripts/test-catalog-keyset.mjs から PGlite で確かめられる。
 */

/** 並びのキー。前のページの最後の行から作る */
export interface CatalogCursor {
  release_date: string;
  created_at: string;
  id: string;
}

/** catalog_page_cursors の 1 行。page_no = 0 は先頭（カーソル null）で、total に全体の件数 */
export interface CatalogPageCursorRow {
  page_no: number;
  after_release: string | null;
  after_created: string | null;
  after_id: string | null;
  total: number | string;
}

/** 範囲を 1 回読む関数。after の次から、until（を含む）まで、最大 limit 件を並び順で返す */
export type FetchAfter<T> = (range: { after: CatalogCursor | null; until: CatalogCursor | null; limit: number }) => Promise<T[]>;

type KeyedRow = { release_date?: unknown; created_at?: unknown; id?: unknown };

export function cursorOf(row: KeyedRow): CatalogCursor {
  return { release_date: String(row.release_date), created_at: String(row.created_at), id: String(row.id) };
}

/** catalog_items_after に渡す引数 */
export function catalogItemsAfterArgs(content: string | null, after: CatalogCursor | null, limit: number, until: CatalogCursor | null = null) {
  return {
    p_content: content,
    p_after_release: after?.release_date ?? null,
    p_after_created: after?.created_at ?? null,
    p_after_id: after?.id ?? null,
    p_limit: limit,
    p_until_release: until?.release_date ?? null,
    p_until_created: until?.created_at ?? null,
    p_until_id: until?.id ?? null,
  };
}

/**
 * after の次から until まで（until が null なら終わりまで）を読む。
 * 1 回で limit 件ちょうど返ってきて、まだ until に届いていないとき（ページの境目を取った後に、その範囲へグッズが増えた）は、
 * 最後の行の次から続きを読む。exhaust = false で until も無いときは 1 回だけ（「先頭から○件」のとき）。
 */
export async function fetchKeysetRange<T extends KeyedRow>(
  fetchAfter: FetchAfter<T>,
  opts: { after: CatalogCursor | null; until: CatalogCursor | null; limit: number; exhaust: boolean }
): Promise<T[]> {
  const out: T[] = [];
  let after = opts.after;
  for (;;) {
    const page = await fetchAfter({ after, until: opts.until, limit: opts.limit });
    out.push(...page);
    if (page.length < opts.limit) break;
    const last = page[page.length - 1];
    if (opts.until ? String(last.id) === opts.until.id : !opts.exhaust) break;
    after = cursorOf(last);
  }
  return out;
}

/** 決まった数ずつ並べて実行する（何十ページも一度に投げない）。結果は list の順 */
async function runLimited<T, R>(list: T[], limit: number, fn: (v: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

/**
 * catalog_page_cursors の境目で一覧を区切り、各ページを並列に読んでつなげる（作品の全件・先頭から maxRows 件）。
 *
 * ページ k は「境目 k の次から、境目 k+1 の行まで」。範囲をキーで区切るので、境目を取った後にグッズが増えても減っても
 * ページ同士が重ならず（重複なし）、すき間もできない（増えた分は fetchKeysetRange が続きを読む）。
 * 境目の行そのものが消えても、キーの値で比べるのでそのまま読める。
 * maxRows を渡したとき（作品を選ばない「新しい順に○件」）は、最後のページを残りの件数で切る。その間に増えた分だけ件数がずれる。
 */
export async function fetchAllByCursors<T extends KeyedRow>(
  cursorRows: CatalogPageCursorRow[],
  fetchAfter: FetchAfter<T>,
  opts: { pageSize: number; concurrency: number; maxRows?: number | null }
): Promise<{ rows: T[]; total: number }> {
  const sorted = [...cursorRows].sort((a, b) => Number(a.page_no) - Number(b.page_no));
  const total = sorted.length > 0 ? Number(sorted[0].total) : 0;
  if (total <= 0) return { rows: [], total: 0 };
  const starts: (CatalogCursor | null)[] = sorted.map((r) =>
    r.after_id && r.after_release && r.after_created
      ? { release_date: String(r.after_release), created_at: String(r.after_created), id: String(r.after_id) }
      : null
  );
  const limited = opts.maxRows != null;
  const pages = await runLimited(
    starts.map((after, i) => ({ after, i })),
    opts.concurrency,
    ({ after, i }) => {
      const until = starts[i + 1] ?? null;
      const isLast = i === starts.length - 1;
      const limit = isLast && limited ? Math.max(1, Math.min(opts.pageSize, total - i * opts.pageSize)) : opts.pageSize;
      return fetchKeysetRange(fetchAfter, { after, until, limit, exhaust: !limited });
    }
  );
  return { rows: pages.flat(), total };
}
