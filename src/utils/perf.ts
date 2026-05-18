/**
 * 軽量パフォーマンス計測ユーティリティ
 * - Web Vitals (TTFB / FCP / LCP) を PerformanceObserver で取得
 * - Supabase 等への fetch 回数を集計（ホスト別）
 * - ルート遷移ごとの「初回表示時間」を計測
 * - 任意の場所から `markPerf(name)` でカスタムマーカーを記録
 *
 * 開発時は `?perf=1` または localStorage.setItem('perf','1') でオーバーレイを表示。
 */

type FetchStat = {
  count: number;
  totalMs: number;
  errors: number;
};

type ResourceStat = {
  count: number;
  totalBytes: number;
  totalMs: number;
};

type PerfSnapshot = {
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  routeReadyMs: number | null;
  currentRoute: string;
  fetchTotal: number;
  fetchByHost: Record<string, FetchStat>;
  resourceByType: Record<string, ResourceStat>;
  resourceTotalBytes: number;
  resourceTotalMs: number;
  marks: { name: string; t: number }[];
};

const listeners = new Set<(s: PerfSnapshot) => void>();

const state: PerfSnapshot = {
  ttfb: null,
  fcp: null,
  lcp: null,
  routeReadyMs: null,
  currentRoute: typeof window !== "undefined" ? window.location.pathname : "/",
  fetchTotal: 0,
  fetchByHost: {},
  marks: [],
};

let routeStartedAt = typeof performance !== "undefined" ? performance.now() : 0;
let routeReadyCaptured = false;

function emit() {
  for (const l of listeners) l({ ...state, fetchByHost: { ...state.fetchByHost }, marks: [...state.marks] });
}

export function subscribePerf(cb: (s: PerfSnapshot) => void) {
  listeners.add(cb);
  cb({ ...state, fetchByHost: { ...state.fetchByHost }, marks: [...state.marks] });
  return () => listeners.delete(cb);
}

export function getPerfSnapshot(): PerfSnapshot {
  return { ...state, fetchByHost: { ...state.fetchByHost }, marks: [...state.marks] };
}

export function markPerf(name: string) {
  if (typeof performance === "undefined") return;
  state.marks.push({ name, t: Math.round(performance.now()) });
  if (state.marks.length > 50) state.marks.shift();
  emit();
}

export function notifyRouteChange(path: string) {
  state.currentRoute = path;
  state.routeReadyMs = null;
  routeStartedAt = performance.now();
  routeReadyCaptured = false;
  emit();
}

/** ルートのコンテンツが描画完了したと判定するためのマーカー。
 *  最初に呼ばれた時刻を「初回表示時間」として採用。 */
export function markRouteReady() {
  if (routeReadyCaptured) return;
  routeReadyCaptured = true;
  state.routeReadyMs = Math.round(performance.now() - routeStartedAt);
  emit();
}

/* ---------- fetch 計装 ---------- */
function installFetchInstrumentation() {
  if (typeof window === "undefined" || (window as any).__perfFetchPatched) return;
  (window as any).__perfFetchPatched = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    let host = "other";
    try {
      host = new URL(url, window.location.origin).host;
    } catch {
      /* ignore */
    }
    const started = performance.now();
    const bucket = (state.fetchByHost[host] ||= { count: 0, totalMs: 0, errors: 0 });
    bucket.count += 1;
    state.fetchTotal += 1;
    try {
      const res = await origFetch(input as any, init);
      bucket.totalMs += performance.now() - started;
      if (!res.ok) bucket.errors += 1;
      emit();
      return res;
    } catch (e) {
      bucket.totalMs += performance.now() - started;
      bucket.errors += 1;
      emit();
      throw e;
    }
  };
}

/* ---------- Web Vitals ---------- */
function installWebVitals() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) state.ttfb = Math.round(nav.responseStart);
  } catch {
    /* ignore */
  }

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          state.fcp = Math.round(entry.startTime);
          emit();
        }
      }
    }).observe({ type: "paint", buffered: true });
  } catch {
    /* ignore */
  }

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) {
        state.lcp = Math.round(last.startTime);
        emit();
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* ignore */
  }
}

export function initPerf() {
  installFetchInstrumentation();
  installWebVitals();
}

export type { PerfSnapshot };
