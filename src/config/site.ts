/**
 * アプリの正規URL（カノニカルドメイン）。
 *
 * https://collectify.jp への移行後も、vercel.app ドメイン・プレビュー環境・ローカル開発・
 * iOS の Capacitor アプリ（`window.location.origin` が `capacitor://localhost` になる）の
 * どこからでも動くように、SNSシェア用・OGP用・サイトマップ用のURLはこの定数に揃える。
 *
 * - VITE_SITE_URL（新しい名前）→ VITE_APP_URL（互換のため残す）→ 既定の "https://collectify.jp"
 * - 認証リダイレクト（パスワード再設定など）は今いるドメインに戻す必要があるので、
 *   ここは使わず `window.location.origin` のままにする。
 */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://collectify.jp"
).replace(/\/+$/, "");
