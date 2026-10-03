import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { SpotlightTour } from "./SpotlightTour";
import { tourForPath } from "./tours";

/**
 * 今いる画面に対応する操作ガイドを1本だけ走らせる。
 *
 * 遅延ロードされた画面とデータ取得が終わる前に穴を開けると、空の場所を
 * 指してしまう。少し待ってから開始する。
 */
const SETTLE_MS = 900;

export function PageTourHost() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { shouldShowTour, markTourDone, disableAllTours } = useOnboarding();
  const [armedId, setArmedId] = useState<string | null>(null);

  const tour = tourForPath(pathname);
  const pending = !!user && !!tour && shouldShowTour(tour.id);

  useEffect(() => {
    if (!pending || !tour) {
      setArmedId(null);
      return;
    }
    const timer = window.setTimeout(() => setArmedId(tour.id), SETTLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [pending, tour]);

  if (!tour || !pending || armedId !== tour.id) return null;

  return (
    <SpotlightTour
      key={tour.id}
      steps={tour.steps}
      onClose={() => markTourDone(tour.id)}
      onDisableAll={disableAllTours}
    />
  );
}
