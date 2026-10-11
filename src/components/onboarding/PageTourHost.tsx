import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { SpotlightTour } from "./SpotlightTour";
import { tourForLocation } from "./tours";
import { isModalOpen, useModalOpen } from "./useModalOpen";

/**
 * 今いる画面に対応する操作ガイドを1本だけ走らせる。
 *
 * 遅延ロードされた画面とデータ取得が終わる前に穴を開けると、空の場所を
 * 指してしまう。少し待ってから開始する。
 *
 * シート・ダイアログが開いているあいだは始めない。始めると、シートの上に暗幕と説明が重なり、
 * 裏に隠れた要素を指してしまう（はじめてガイドでプロフィール編集を開いた直後に、
 * マイページのガイドが編集シートの上に出ていた。PC の広い画面で特に目立った）。
 * 閉じたら、あらためて少し待ってから始める。
 */
const SETTLE_MS = 900;

export function PageTourHost() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const { shouldShowTour, markTourDone, disableAllTours } = useOnboarding();
  const [armedId, setArmedId] = useState<string | null>(null);
  const modalOpen = useModalOpen();

  const tour = tourForLocation(pathname, search);
  // はじめてガイドの項目から来たとき（?guide=）は、そちらの案内（GuideHost）を優先して重ねない
  const fromGuide = new URLSearchParams(search).has("guide");
  const pending = !!user && !!tour && !fromGuide && shouldShowTour(tour.id);

  useEffect(() => {
    if (!pending || !tour) {
      setArmedId(null);
      return;
    }
    // 始まったあとは、ガイドの操作で開いたシートで消さない
    if (armedId === tour.id || modalOpen) return;
    const timer = window.setTimeout(() => {
      // 待っているあいだに開いたシートも見る
      if (!isModalOpen()) setArmedId(tour.id);
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [pending, tour, modalOpen, armedId]);

  if (!tour || !pending || armedId !== tour.id) return null;

  return (
    <SpotlightTour
      key={tour.id}
      steps={tour.steps}
      onClose={(reason) => {
        // 1歩も見せられなかったとき（対象が出てこなかった）は記録しない。次にこの画面へ来たらもう一度試す
        if (reason !== "unavailable") markTourDone(tour.id);
      }}
      onDisableAll={disableAllTours}
    />
  );
}
