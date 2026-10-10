import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Hand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * 画面の「実物」を指して説明するスポットライト型ガイド。
 *
 * スライドで機能を読ませる方式をやめてこちらにした理由:
 * 説明を読んだ時点では指し示す対象が画面に無いため、読み終えた直後に
 * 何も残らない。実際のボタンを光らせて「押してみて」まで持っていけば、
 * 操作そのものが説明になる。
 *
 * 設計上の要点:
 * - 対象は data-tour 属性で指す。DOM構造やクラス名の変更で壊れないように。
 * - 穴の外側だけを4枚の板で覆う。対象そのものには板を重ねないので、
 *   ユーザーは光っているボタンを本当に押せる（これが体験型の核）。
 * - 対象が見つからないステップは飛ばす。条件表示のカード（空状態や
 *   閉じられたチェックリスト）を指していても止まらないようにする。
 */

export type TourStepAdvance = "next" | "click";

export interface TourStep {
  /** 対象要素の data-tour 値。省略すると画面中央に説明だけ出す。 */
  target?: string;
  /** 見出しの翻訳キー。 */
  titleKey: string;
  /** 本文の翻訳キー。 */
  bodyKey: string;
  /**
   * "click" にすると、ユーザーが対象を実際に押したときだけ次へ進む。
   * 「次へ」ボタンは出さず、代わりに押すよう促す。
   */
  advance?: TourStepAdvance;
  /** 対象が遅れて現れる場合の待ち時間(ms)。既定600。 */
  waitMs?: number;
  /** 穴の内側の余白(px)。既定8。 */
  padding?: number;
}

interface SpotlightTourProps {
  steps: TourStep[];
  /** 完走・スキップのどちらでも呼ぶ。 */
  onClose: (reason: "finished" | "skipped") => void;
  /** 「ガイドをすべてオフ」を押したとき。未指定なら表示しない。 */
  onDisableAll?: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// 背景のスクロールは止めない。body に overflow:hidden を掛けると、
// 画面外にある対象を scrollIntoView で画面内へ送れなくなり（実測で確認）、
// 下の方のボタンを指すステップが何も無い場所を暗くしたまま止まる。
// 代わりに穴と説明カードをスクロールに追従させてある。
const CARD_WIDTH = 320;
const GUTTER = 16;
/** 下タブ（中央ボタンが張り出す）に隠れない余白。説明カードを画面下に固定するとき使う */
const BOTTOM_NAV_CLEARANCE = 104;

/**
 * data-tour は同じ名前がレスポンシブで2箇所に付くことがある
 * （例: モバイルの下タブとデスクトップのヘッダナビ）。display:none の側は
 * 矩形が 0 になるため、実際に見えている方を選ぶ。
 */
function findTarget(name: string): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)
  );
  return (
    candidates.find((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    }) ?? null
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function SpotlightTour({ steps, onClose, onDisableAll }: SpotlightTourProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  /** 対象を探している間は暗幕を出さない（空の暗転を見せない）。 */
  const [resolved, setResolved] = useState(false);
  const closedRef = useRef(false);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const padding = step?.padding ?? 8;

  // onClose は呼び出し側でインライン関数として渡されることが多く、
  // 親が再描画されるたび別物になる。これを依存配列に入れると下の
  // クリック待ちエフェクトが貼り直され、「押した420ms後に次へ進む」
  // タイマーが片付けで消されてしまう（実機で1歩目から進まなくなる）。
  // 参照はrefに逃がして、close / goNext の同一性を保つ。
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback((reason: "finished" | "skipped") => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current(reason);
  }, []);

  const goNext = useCallback(() => {
    setIndex((prev) => {
      if (prev + 1 >= steps.length) {
        close("finished");
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length, close]);

  // ── 対象の探索と計測 ────────────────────────────────
  // 対象が条件表示で未マウントのことがあるため、少しだけ待ってから諦める。
  useLayoutEffect(() => {
    if (!step) return;
    let cancelled = false;
    setResolved(false);
    setRect(null);

    if (!step.target) {
      setResolved(true);
      return;
    }

    const deadline = Date.now() + (step.waitMs ?? 600);

    const measure = () => {
      if (cancelled) return;
      const el = findTarget(step.target!);
      if (!el) {
        if (Date.now() > deadline) {
          // 見つからないステップは飛ばす。最後のステップならツアー終了。
          if (index + 1 >= steps.length) close("finished");
          else setIndex(index + 1);
          return;
        }
        requestAnimationFrame(measure);
        return;
      }

      const box = el.getBoundingClientRect();
      // 画面外なら中央まで送ってから測り直す。
      const offscreen = box.top < GUTTER || box.bottom > window.innerHeight - GUTTER;
      if (offscreen) {
        el.scrollIntoView({
          block: "center",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      setResolved(true);
    };

    measure();
    return () => {
      cancelled = true;
    };
  }, [step, index, steps.length, close]);

  // スクロール・リサイズ・レイアウト変化に穴を追従させる。
  useEffect(() => {
    if (!step?.target || !resolved) return;
    const el = findTarget(step.target);
    if (!el) return;

    const sync = () => {
      const box = el.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    };

    window.addEventListener("scroll", sync, { passive: true, capture: true });
    window.addEventListener("resize", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    // スムーススクロールの着地点を拾うため、少し遅れてもう一度測る。
    const settle = window.setTimeout(sync, 350);

    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      ro.disconnect();
      window.clearTimeout(settle);
    };
  }, [step, resolved]);

  // ── 実際に押されたら進む ────────────────────────────
  useEffect(() => {
    if (!step?.target || step.advance !== "click" || !resolved) return;
    const el = findTarget(step.target);
    if (!el) return;

    let timer = 0;
    const onHit = () => {
      // 最後のステップは待たずに閉じる。押した先が別画面だと、待っている間に
      // 画面ごと外れて「見終わった」記録が残らず、戻るたび再表示されてしまう。
      if (isLast) {
        close("finished");
        return;
      }
      // 押した結果（シートが開くなど）が描画されてから次のステップへ。
      timer = window.setTimeout(goNext, 420);
    };
    el.addEventListener("click", onHit, { capture: true, once: true });
    return () => {
      el.removeEventListener("click", onHit, true);
      window.clearTimeout(timer);
    };
  }, [step, resolved, goNext, isLast, close]);

  // Escape でスキップ。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close("skipped");
      if (e.key === "Enter" && step?.advance !== "click") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goNext, step]);

  // ── 説明カードの位置 ────────────────────────────────
  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (!rect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(CARD_WIDTH, vw - GUTTER * 2);
    // 対象が画面より縦に長い（ページ全体を指すなど）と、上端が画面外にあって
    // 「対象の上」に置いた説明カードごと画面外へ出てしまう。
    // 画面内に見えている範囲だけを基準にして、置き場所を決める。
    const visibleTop = Math.max(rect.top - padding, 0);
    const visibleBottom = Math.min(rect.top + rect.height + padding, vh);
    const spaceBelow = vh - visibleBottom;
    const spaceAbove = visibleTop;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, GUTTER),
      vw - width - GUTTER
    );

    if (spaceBelow > 220) return { top: visibleBottom + 12, left, width };
    if (spaceAbove > 220) return { bottom: vh - visibleTop + 12, left, width };
    // どちらにも収まらない: 画面下に固定する（下タブに隠れない高さ）。
    return { bottom: BOTTOM_NAV_CLEARANCE, left, width };
  }, [rect, padding]);

  if (!step || !resolved) return null;

  const hole = rect
    ? {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
    : null;

  const shade = "fixed bg-black/65 z-[9990]";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("tour.a11yLabel")}>
      {/* 穴の外側だけを覆う4枚。対象の上には何も重ねないので本当に押せる。 */}
      {hole ? (
        <>
          <div className={shade} style={{ top: 0, left: 0, right: 0, height: Math.max(hole.top, 0) }} />
          <div
            className={shade}
            style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className={shade}
            style={{ top: hole.top, left: 0, width: Math.max(hole.left, 0), height: hole.height }}
          />
          <div
            className={shade}
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          {/* 光らせる枠。クリックは下の実物に通す。 */}
          <div
            className={cn(
              "fixed z-[9992] rounded-2xl pointer-events-none",
              "ring-2 ring-primary ring-offset-2 ring-offset-transparent",
              step.advance === "click" && "motion-safe:animate-pulse"
            )}
            style={hole}
          />
        </>
      ) : (
        <div className={cn(shade, "inset-0")} />
      )}

      {/* 説明カード */}
      <div className="fixed z-[9995]" style={cardStyle}>
        <div className="rounded-2xl bg-card text-card-foreground shadow-2xl border border-border p-4 space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-bold leading-snug">{t(step.titleKey)}</h2>
            <button
              type="button"
              onClick={() => close("skipped")}
              aria-label={t("tour.skip")}
              className="shrink-0 -mr-1 -mt-1 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>

          <div className="flex items-center gap-2">
            {/* 進捗。何歩で終わるかが見えないと離脱する。 */}
            <div className="flex items-center gap-1" aria-hidden>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <span className="sr-only">
              {t("tour.progress", { current: index + 1, total: steps.length })}
            </span>

            <div className="ml-auto">
              {step.advance === "click" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Hand className="h-3.5 w-3.5" />
                  {t("tour.tapIt")}
                </span>
              ) : (
                <Button size="sm" className="h-9 px-4 gap-1.5" onClick={goNext}>
                  {isLast ? t("tour.done") : t("tour.next")}
                  {isLast ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          </div>

          {onDisableAll && (
            <button
              type="button"
              onClick={() => {
                onDisableAll();
                close("skipped");
              }}
              className="w-full text-2xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            >
              {t("tour.disableAll")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
