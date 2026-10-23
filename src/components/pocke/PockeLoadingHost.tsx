import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { Pocke } from "./Pocke";

/** これより短い読み込みでは出さない。即時表示だと、ほとんどの読み込みで一瞬チラつくだけになる */
const SHOW_AFTER_MS = 600;

/**
 * データの読み込みが少し長引いたときだけ、画面の端にポッケを出す（考え中のポーズで弾む）。
 *
 * react-query の進行中フェッチ数（useIsFetching）を見るだけなので、画面ごとに仕込みは要らない。
 * App に1つだけマウントする。ミューテーション（保存・送信など）はボタン側に個別のスピナーが
 * あるので対象にしない。ここは「読み込み」だけを見る。
 */
export function PockeLoadingHost() {
  const activeFetches = useIsFetching();
  const [show, setShow] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (activeFetches === 0) {
      window.clearTimeout(timer.current);
      setShow(false);
      return;
    }
    timer.current = window.setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer.current);
  }, [activeFetches]);

  if (!show) return null;

  return (
    <div
      // 左下固定（PockeCheerHost は右下）。下タブ・下部固定ボタンにかぶらない高さに置く
      className="pointer-events-none fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+2rem)] left-3 z-[80] motion-safe:animate-fade-in sm:bottom-6 sm:left-6"
      aria-hidden="true"
    >
      <Pocke pose="think" height={56} motion="bob" />
    </div>
  );
}
