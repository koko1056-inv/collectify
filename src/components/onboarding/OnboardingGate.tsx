import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { WelcomeOnboarding } from "./WelcomeOnboarding";

/**
 * 初回ウェルカムを「アプリのどこに居ても」出す。
 *
 * 以前は /my-room の中だけで描画していた。ところがログイン後の着地点が
 * /collection に移り、下タブからも /my-room へ行けないため、新規ユーザーには
 * 一度も表示されていなかった（2026年8月以降の登録は profiles.onboarded_at が
 * 全員 null）。画面に紐づけず、ルート直下で出し続けるようにする。
 */

/**
 * ウェルカムを出さない画面。
 * 共有リンクで開く詳細ページと法務ページは、受け取った本人が
 * 目的の内容を見られないと意味がないので素通しする。
 */
const EXEMPT_PREFIXES = [
  "/login",
  "/privacy",
  "/terms",
  "/how-to-use",
  "/invite",
  "/user",
  "/room",
  "/ai-work",
  "/ai-avatar",
];

export function OnboardingGate() {
  const { user } = useAuth();
  const { onboardingState, isInitialized } = useOnboarding();
  const { pathname } = useLocation();

  if (!user) return null;
  // DB同期前は何も出さない。ローカル未完了でも完了済みのことがある。
  if (!isInitialized) return null;
  if (onboardingState.hasCompletedWelcome) return null;
  if (EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  // completeWelcome は WelcomeOnboarding が自分で呼ぶ。ここで重ねて呼ぶと
  // profiles の更新が二重に走るだけなので何もしない。
  return <WelcomeOnboarding onComplete={() => {}} />;
}
