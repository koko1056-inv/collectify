import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  subscribePerf,
  notifyRouteChange,
  type PerfSnapshot,
} from "@/utils/perf";

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("perf") === "1") {
      localStorage.setItem("perf", "1");
      return true;
    }
    if (new URLSearchParams(window.location.search).get("perf") === "0") {
      localStorage.removeItem("perf");
      return false;
    }
    return localStorage.getItem("perf") === "1" || import.meta.env.DEV;
  } catch {
    return import.meta.env.DEV;
  }
}

function formatBytes(b: number): string {
  if (!b) return "0B";
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * 開発・QA用のフローティング計測オーバーレイ。
 * 表示 ON/OFF: URL に `?perf=1` を付ける、または localStorage.setItem('perf','1')
 * 本番ビルドでも `?perf=1` を付ければ表示可能（一般ユーザーには見えない）。
 */
export function PerfOverlay() {
  const location = useLocation();
  const [snap, setSnap] = useState<PerfSnapshot | null>(null);
  const [open, setOpen] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const unsub = subscribePerf(setSnap);
    return () => {
      unsub();
    };
  }, [enabled]);

  useEffect(() => {
    notifyRouteChange(location.pathname);
  }, [location.pathname]);

  if (!enabled || !snap) return null;

  const hosts = Object.entries(snap.fetchByHost).sort((a, b) => b[1].count - a[1].count);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: 12,
        zIndex: 99999,
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        lineHeight: 1.4,
        background: "rgba(0,0,0,0.78)",
        color: "#fff",
        padding: open ? "8px 10px" : "4px 8px",
        borderRadius: 8,
        maxWidth: open ? 280 : "auto",
        backdropFilter: "blur(6px)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 8, cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
      >
        <strong>⏱ Perf</strong>
        <span>
          {snap.routeReadyMs != null ? `${snap.routeReadyMs}ms` : "…"} · {snap.fetchTotal} req
        </span>
      </div>
      {open && (
        <div style={{ marginTop: 6, display: "grid", gap: 2 }}>
          <div>route: <span style={{ opacity: 0.8 }}>{snap.currentRoute}</span></div>
          <div>TTFB: {snap.ttfb ?? "-"}ms · FCP: {snap.fcp ?? "-"}ms · LCP: {snap.lcp ?? "-"}ms</div>
          <div>route ready: {snap.routeReadyMs != null ? `${snap.routeReadyMs}ms` : "measuring…"}</div>
          <div style={{ marginTop: 4, opacity: 0.85 }}>fetches:</div>
          {hosts.length === 0 && <div style={{ opacity: 0.6 }}>(none)</div>}
          {hosts.slice(0, 6).map(([host, s]) => (
            <div key={host} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{host}</span>
              <span>
                {s.count} · {Math.round(s.totalMs)}ms{s.errors ? ` · ✗${s.errors}` : ""}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 4, opacity: 0.85 }}>
            resources: {Object.values(snap.resourceByType).reduce((a, b) => a + b.count, 0)} ·{" "}
            {formatBytes(snap.resourceTotalBytes)} · {Math.round(snap.resourceTotalMs)}ms
          </div>
          {Object.entries(snap.resourceByType)
            .sort((a, b) => b[1].totalBytes - a[1].totalBytes)
            .map(([type, s]) => (
              <div key={type} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{type}</span>
                <span>
                  {s.count} · {formatBytes(s.totalBytes)} · {Math.round(s.totalMs)}ms
                </span>
              </div>
            ))}
          {snap.marks.length > 0 && (
            <>
              <div style={{ marginTop: 4, opacity: 0.85 }}>marks:</div>
              {snap.marks.slice(-5).map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{m.name}</span>
                  <span>{m.t}ms</span>
                </div>
              ))}
            </>
          )}
          <div style={{ marginTop: 6, opacity: 0.6 }}>?perf=0 で非表示</div>
        </div>
      )}
    </div>
  );
}
