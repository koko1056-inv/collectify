/**
 * LINE通知・LINEログイン・Appleサインインの機能フラグ。
 * すべて未設定（デフォルトOFF）なら、今までと完全に同じ動作になる。
 */

// LIFF ID は公開情報（クライアントに露出）なので既定値を直接埋め込み、
// 環境変数 VITE_LIFF_ID があればそちらを優先。LiffAutoLink.tsx もこの値を使う
// （コンポーネントファイルから定数をexportするとFast Refreshの警告になるため、ここを唯一の定義元にする）。
export const LIFF_ID = (import.meta.env.VITE_LIFF_ID as string | undefined) || "2010453556-4OGxmwaE";

/** LINE公式アカウントのベーシックID（例 "@xxxx"）。未設定なら友だち追加の案内は一切出さない。 */
export const LINE_OA_BASIC_ID = ((import.meta.env.VITE_LINE_OA_BASIC_ID as string | undefined) ?? "").trim();

/** LINEログインボタンを出すかどうか。 */
export const ENABLE_LINE_LOGIN = (import.meta.env.VITE_ENABLE_LINE_LOGIN as string | undefined) === "true";

/** Supabaseに設定したLINE用カスタムOAuthプロバイダの識別子。 */
export const LINE_AUTH_PROVIDER = ((import.meta.env.VITE_LINE_AUTH_PROVIDER as string | undefined) ?? "").trim() || "custom:line";

/** Appleでサインインボタンを出すかどうか。 */
export const ENABLE_APPLE_LOGIN = (import.meta.env.VITE_ENABLE_APPLE_LOGIN as string | undefined) === "true";

/** LINEで友だち追加するためのURL（ベーシックID未設定なら空文字）。 */
export const LINE_ADD_FRIEND_URL = LINE_OA_BASIC_ID
  ? `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_BASIC_ID)}`
  : "";

/** LINEアプリ内でLiffAutoLinkの紐付けを行うためのLIFF URL（LINE外のブラウザから開く入口）。 */
export const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;
