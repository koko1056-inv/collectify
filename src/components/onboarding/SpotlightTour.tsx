import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Hand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Pocke, type PockePose } from "@/components/pocke/Pocke";

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
   * 下タブが出ない広い画面（PC など）での本文の翻訳キー。省略すると bodyKey。
   * 「下のタブ」「中央の丸いボタン」のように、スマホの見た目を前提にした説明が PC では指す物と食い違うため。
   */
  wideBodyKey?: string;
  /**
   * "click" にすると、ユーザーが対象を実際に押したときだけ次へ進む。
   * 「次へ」ボタンは出さず、代わりに押すよう促す。
   */
  advance?: TourStepAdvance;
  /** 対象が遅れて現れる場合の待ち時間(ms)。既定600。 */
  waitMs?: number;
  /** 穴の内側の余白(px)。既定8。 */
  padding?: number;
  /**
   * 説明するポッケの表情。省略すると、最初は手を振る・押してほしいときは指さし・最後はウインク・ほかは指さし。
   */
  pose?: PockePose;
}

/** ステップに合ったポッケの表情（指定が無いとき） */
function defaultPose(step: TourStep, index: number, total: number): PockePose {
  if (step.pose) return step.pose;
  if (step.advance === "click") return "point";
  if (index === 0 && total > 1) return "wave";
  if (index === total - 1 && total > 1) return "wink";
  return "point";
}

/**
 * 閉じた理由。"unavailable" は、どのステップの対象も見つからず、1歩も見せないまま終わったとき。
 * 見ていないのに「見終わった」と記録すると、その画面のガイドは二度と出ない
 * （画面の読み込みが遅い回線や PC で、マイページのガイドが一度も出ずに記録だけ残っていた）。
 */
export type TourCloseReason = "finished" | "skipped" | "unavailable";

interface SpotlightTourProps {
  steps: TourStep[];
  /** 完走・スキップ・1歩も見せられなかったときに呼ぶ。 */
  onClose: (reason: TourCloseReason) => void;
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
const CARD_WIDTH = 340;
const GUTTER = 16;
/** 下タブ（中央ボタンが張り出す）に隠れない余白。説明カードを画面下に固定するとき使う */
const BOTTOM_NAV_CLEARANCE = 104;
/** 下タブが出ない広い画面（Footer の sm:hidden と同じ境目）で、説明カードを画面下に固定するときの余白 */
const WIDE_BOTTOM_CLEARANCE = 32;
const WIDE_QUERY = "(min-width: 640px)";
/** ステップの対象を待つ時間。1歩目は画面の読み込み中のことが多いので長めに待つ */
const STEP_WAIT_MS = 600;
const FIRST_STEP_WAIT_MS = 2000;
/** 説明カードを対象の上下に置くのに要る高さ（カードの高さを測れるまでの目安） */
const CARD_ROOM = 220;
/** 大きな対象を送るとき、頭の上に残す余白（説明カードを対象の上に置ける高さ） */
const TALL_TOP_ROOM = 240;

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

/** 下タブが出ない広い画面か（Footer の sm:hidden と同じ境目） */
function isWideScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.(WIDE_QUERY).matches === true;
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
  /** 指していた対象が画面から消えたら増やして、探し直す */
  const [lookup, setLookup] = useState(0);
  const closedRef = useRef(false);
  /** 1歩でも見せたか（見せずに終わったら "unavailable" で閉じる） */
  const shownRef = useRef(false);

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

  const close = useCallback((reason: TourCloseReason) => {
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
      shownRef.current = true;
      setResolved(true);
      return;
    }

    // まだ1歩も見せていないうちは、画面の読み込みが終わっていないことが多いので長めに待つ
    // （PC の広い画面は一度に読み込む量が多く、マイページの1歩目が 600ms では間に合わずに飛ばされていた）
    const deadline = Date.now() + (step.waitMs ?? (shownRef.current ? STEP_WAIT_MS : FIRST_STEP_WAIT_MS));

    const measure = () => {
      if (cancelled) return;
      const el = findTarget(step.target!);
      if (!el) {
        if (Date.now() > deadline) {
          // 見つからないステップは飛ばす。最後のステップならツアー終了。
          if (index + 1 >= steps.length) close(shownRef.current ? "finished" : "unavailable");
          else setIndex(index + 1);
          return;
        }
        requestAnimationFrame(measure);
        return;
      }

      const box = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 大きな対象（検索結果の一覧・みんなのフィード全体など）を中央へ送ると、
      // 一覧の途中だけが映って上の見出しや検索欄が画面外へ出たうえ、上下どちらにも説明カードの
      // 置き場が無くなり、カードが一覧の中身に重なっていた（PC の広い画面で目立った）。
      // 大きな対象は頭が画面の上半分に見えていれば送らない。見えていないとき（または頭の上に余白を
      // 残しても全体が収まるのにはみ出しているとき）は、頭の上に説明カードが入る余白を残して送る。
      const big = box.height > vh - CARD_ROOM * 2;
      const fitsWithRoom = box.height + TALL_TOP_ROOM + GUTTER <= vh;
      const offscreen = big
        ? box.top < 0 || box.top > vh / 2 || (fitsWithRoom && box.bottom > vh - GUTTER)
        : box.top < GUTTER || box.bottom > vh - GUTTER;
      if (offscreen) {
        // scrollIntoView は scroll-margin を見るので、送るあいだだけ頭の上の余白として付ける
        const prevMargin = el.style.scrollMarginTop;
        if (big) el.style.scrollMarginTop = `${Math.min(TALL_TOP_ROOM, vh / 2)}px`;
        el.scrollIntoView({
          block: big ? "start" : "center",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
        if (big) window.setTimeout(() => (el.style.scrollMarginTop = prevMargin), 1000);
      }
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      shownRef.current = true;
      setResolved(true);
    };

    measure();
    return () => {
      cancelled = true;
    };
  }, [step, index, steps.length, close, lookup]);

  // スクロール・リサイズ・レイアウト変化に穴を追従させる。
  useEffect(() => {
    if (!step?.target || !resolved) return;
    const el = findTarget(step.target);
    if (!el) return;

    const sync = () => {
      // 指していた対象が消えた（読み込みが終わって出し分けが変わった、など）。
      // そのまま測ると矩形が 0 になり、穴と説明カードが画面の左上に飛ぶ
      // （交換画面の「準備」カードが、読み込み後に消えて左上を指していた）。探し直す。
      if (!el.isConnected) {
        setLookup((n) => n + 1);
        return;
      }
      const box = el.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    };

    window.addEventListener("scroll", sync, { passive: true, capture: true });
    window.addEventListener("resize", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    // 対象が DOM から外されたことは ResizeObserver では分からないので、外れたときだけ拾う
    const mo = new MutationObserver(() => {
      if (!el.isConnected) sync();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // スムーススクロールの着地点を拾うため、少し遅れてもう一度測る。
    const settle = window.setTimeout(sync, 350);

    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      ro.disconnect();
      mo.disconnect();
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const sync = () => setCardHeight(el.offsetHeight);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resolved, index]);

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

    // 説明カードが収まるか。カードの高さは文言の長さと「ガイドをすべて表示しない」の有無で変わるので、
    // 測れたら実際の高さで判断する（決め打ちの 220px だと、PC の検索画面で 207px 空いているのに入らない扱いになり、
    // カードが一覧の上に重なっていた）。
    const need = cardHeight > 0 ? cardHeight + 20 : CARD_ROOM;
    if (spaceBelow > need) return { top: visibleBottom + 12, left, width };
    if (spaceAbove > need) return { bottom: vh - visibleTop + 12, left, width };
    // どちらにも収まらない: 画面下に固定する（下タブに隠れない高さ）。
    // 下タブの無い広い画面では、そのぶん浮かせると画面の真ん中に出て一覧の中身に重なるので、下に寄せる。
    return { bottom: isWideScreen() ? WIDE_BOTTOM_CLEARANCE : BOTTOM_NAV_CLEARANCE, left, width };
  }, [rect, padding, cardHeight]);

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
        <div ref={cardRef} className="rounded-2xl bg-card text-card-foreground shadow-2xl border border-border p-4 space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
          {/* 説明するのはポッケ。ステップが変わるたびに跳ねて出てくる */}
          <div className="flex items-start gap-3">
            <Pocke key={index} pose={defaultPose(step, index, steps.length)} height={68} motion="pop" className="-mb-1 -ml-1" />
            <div className="min-w-0 flex-1 space-y-1.5">
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

              <p className="text-xs leading-relaxed text-muted-foreground">
                {t(step.wideBodyKey && isWideScreen() ? step.wideBodyKey : step.bodyKey)}
              </p>
            </div>
          </div>

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
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
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
