import { useCallback, useEffect, useSyncExternalStore } from "react";

// beforeinstallprompt は、画面が出来上がる前に発火することがある。
// 取りこぼさないよう、モジュールを読み込んだ時点（main.tsx）で受け取って保持する。
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS は Mac を名乗るので、タッチ点数でも見分ける
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function listenForInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // ブラウザ標準のバーを出さず、アプリ側の案内から出す
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export type InstallState = "installed" | "can-prompt" | "ios-manual" | "unavailable";

/**
 * 「アプリとして使う」案内の状態。
 *  - installed:   すでにホーム画面から開いている／インストール済み
 *  - can-prompt:  Android / PC の Chrome など。ボタンひとつでインストールできる
 *  - ios-manual:  iPhone / iPad。共有メニューから「ホーム画面に追加」してもらう
 *  - unavailable: 対応していない（案内を出さない）
 */
export function useInstallPrompt() {
  const hasPrompt = useSyncExternalStore(subscribe, () => deferred !== null, () => false);
  const wasInstalled = useSyncExternalStore(subscribe, () => installed, () => false);

  // 表示モードが切り替わったとき（インストール直後など）に再評価する
  useEffect(() => {
    const mq = window.matchMedia?.("(display-mode: standalone)");
    if (!mq) return;
    const on = () => emit();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  const state: InstallState =
    wasInstalled || isStandalone() ? "installed" : hasPrompt ? "can-prompt" : isIosDevice() ? "ios-manual" : "unavailable";

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    const ev = deferred;
    deferred = null; // 1つの案内で使えるのは1回きり
    emit();
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  }, []);

  return { state, promptInstall };
}
