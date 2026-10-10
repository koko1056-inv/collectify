import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SpotlightTour } from "./SpotlightTour";
import { guideForLocation } from "./guideTasks";

/** 画面とデータが出そろうまで少し待ってから光らせる（PageTourHost と同じ考え方） */
const SETTLE_MS = 700;

/**
 * 「Collectifyはじめてガイド」の項目から来たとき（?guide=<id>）に、操作する場所を案内する。
 * 案内を閉じたら ?guide= を外す（戻る操作や再読み込みで何度も出ないように）。
 * ページごとの初回ガイド（PageTourHost）とは別物で、何度押しても毎回出る。
 */
export function GuideHost() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const guide = user ? guideForLocation(pathname, search) : null;
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const key = guide ? `${pathname}${search}` : null;

  useEffect(() => {
    if (!key) {
      setArmedKey(null);
      return;
    }
    const timer = window.setTimeout(() => setArmedKey(key), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  if (!guide || armedKey !== key) return null;

  const clearParam = () => {
    const params = new URLSearchParams(search);
    params.delete("guide");
    const qs = params.toString();
    navigate(`${pathname}${qs ? `?${qs}` : ""}`, { replace: true });
  };

  return <SpotlightTour key={key} steps={guide.task.steps} onClose={clearParam} />;
}
