import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { RotateCw, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pocke, PockeBubble } from "./Pocke";
import { POCKE_CHEER_EVENT } from "./pockeCheer";
import { inlineLoadErrorCount, subscribeInlineLoadErrors } from "./pockeLoad";

/** 再試行がこれより長く続いたときだけ「ちょっと待ってね」を出す（すぐ通るときは何も出さない） */
const WAIT_DELAY_MS = 1500;
/** PockeCheerHost が出している時間（そのあいだは重ならないよう引っ込める） */
const CHEER_MS = 2400;

/** 画面にまだ何も出せていない（キャッシュが無い）読み込みだけを対象にする。meta.silentError のものはその場で静かに扱う */
const needsNotice = (q: Query) => q.state.data === undefined && !q.meta?.silentError;

/**
 * 読み込みがうまくいかないときのポッケ（以前は赤いトースト「データの読み込みに失敗しました」）。
 *  - 一時的な失敗で再試行しているあいだ（1.5秒以上続いたら）: 「ちょっと待ってね…」とおねむ顔で待つ
 *  - 再試行してもだめだったとき: 「うまく読み込めなかったみたい…」と「もう一度読み込む」ボタン
 * 画面の左下に出す（右下は PockeCheerHost）。やったねのポッケが出ているあいだは引っ込める。
 * 画面の中に QueryErrorState（同じポッケの「もう一度読み込む」）が出ているときは、失敗の知らせは重ねて出さない。
 * 見た目のポッケ＋吹き出しは飾りで、文章はライブリージョン（polite）で読み上げる。
 */
export function PockeLoadHost() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [state, setState] = useState({ retrying: false, failedAt: 0 });
  const [waiting, setWaiting] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(0);
  const [cheering, setCheering] = useState(false);
  const cheerTimer = useRef<number>();

  // クエリの状態を見張る。通知は描画中にも来るので、まとめて次の tick で数え直す
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    let scheduled = 0;
    const compute = () => {
      scheduled = 0;
      let retrying = false;
      let failedAt = 0;
      for (const q of cache.getAll()) {
        if (!needsNotice(q)) continue;
        if (q.state.fetchStatus === "fetching" && q.state.fetchFailureCount > 0) retrying = true;
        else if (q.state.status === "error" && q.state.fetchStatus === "idle" && q.isActive()) {
          failedAt = Math.max(failedAt, q.state.errorUpdatedAt);
        }
      }
      setState((prev) => (prev.retrying === retrying && prev.failedAt === failedAt ? prev : { retrying, failedAt }));
    };
    const schedule = () => {
      if (!scheduled) scheduled = window.setTimeout(compute, 0);
    };
    compute();
    const unsubscribe = cache.subscribe(schedule);
    return () => {
      unsubscribe();
      window.clearTimeout(scheduled);
    };
  }, [queryClient]);

  // 再試行がしばらく続いたときだけ「待ってね」を出す
  useEffect(() => {
    if (!state.retrying) {
      setWaiting(false);
      return;
    }
    const id = window.setTimeout(() => setWaiting(true), WAIT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [state.retrying]);

  useEffect(() => {
    const onCheer = () => {
      setCheering(true);
      window.clearTimeout(cheerTimer.current);
      cheerTimer.current = window.setTimeout(() => setCheering(false), CHEER_MS);
    };
    window.addEventListener(POCKE_CHEER_EVENT, onCheer);
    return () => {
      window.removeEventListener(POCKE_CHEER_EVENT, onCheer);
      window.clearTimeout(cheerTimer.current);
    };
  }, []);

  // 画面の中にもう「うまく読み込めなかったみたい…」が出ているなら、ここでは重ねて言わない
  const inlineErrors = useSyncExternalStore(subscribeInlineLoadErrors, inlineLoadErrorCount);
  const failed = !state.retrying && state.failedAt > dismissedAt && inlineErrors === 0;
  const mode = failed ? "failed" : waiting ? "waiting" : null;
  const text = mode === "failed" ? t("pocke.load.failed") : mode === "waiting" ? t("pocke.load.waiting") : "";

  const retry = () => {
    setDismissedAt(state.failedAt);
    void queryClient.refetchQueries({ type: "active", predicate: (q) => q.state.status === "error" });
  };

  return (
    <>
      {/* 画面読み上げ用。見た目のポッケ＋吹き出しは飾りなので、文章はここだけで読み上げる */}
      <span className="sr-only" role="status" aria-live="polite">
        {text}
      </span>
      {mode && !cheering && (
        <div
          key={mode}
          className="pointer-events-none fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+2rem)] left-3 z-[89] flex items-end gap-1.5 sm:bottom-6 sm:left-6"
          data-testid="pocke-load"
        >
          <Pocke pose={mode === "failed" ? "sad" : "sleepy"} height={72} motion={mode === "failed" ? "pop" : "pop-bob"} />
          <PockeBubble tail="left" className="pointer-events-auto mb-4 max-w-[13rem] py-2 text-sm motion-safe:animate-fade-in">
            <p aria-hidden="true" className="font-bold">
              {text}
            </p>
            {mode === "failed" && (
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("pocke.load.retry")}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedAt(state.failedAt)}
                  aria-label={t("pocke.load.close")}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </PockeBubble>
        </div>
      )}
    </>
  );
}
