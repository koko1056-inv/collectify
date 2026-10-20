/**
 * アプリ内ブラウザ（Instagram/LINE/X/Facebook/TikTok など）かどうかの判定。
 *
 * アプリ内ブラウザで登録すると、別タブ・別アプリ（Safari/Chrome）のCookie・localStorageとは
 * 別物として扱われることが多く、あとでSafariを開いたときにログインや「おためしの袋」の中身が
 * 引き継がれない。登録前に気づいてもらうための判定だけをここに集める。
 */
export type InAppBrowserKind = "line" | "instagram" | "facebook" | "twitter" | "tiktok" | "wechat";

const PATTERNS: Array<[InAppBrowserKind, RegExp]> = [
  ["line", /\bLine\//i],
  ["instagram", /Instagram/i],
  ["facebook", /FBAN|FBAV/i],
  ["twitter", /Twitter/i],
  ["tiktok", /BytedanceWebview|musical_ly/i],
  ["wechat", /MicroMessenger/i],
];

function currentUserAgent(): string {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

/** アプリ内ブラウザなら種類を返す。通常のブラウザなら null */
export function detectInAppBrowser(ua: string = currentUserAgent()): InAppBrowserKind | null {
  const found = PATTERNS.find(([, re]) => re.test(ua));
  return found ? found[0] : null;
}

export function isInAppBrowser(ua: string = currentUserAgent()): boolean {
  return detectInAppBrowser(ua) !== null;
}

export function isAndroidUserAgent(ua: string = currentUserAgent()): boolean {
  return /Android/i.test(ua);
}

/** Android で「Chromeで開く」ボタン用の intent:// URL（Chromeが無ければ何も起きない） */
export function buildAndroidChromeIntentUrl(url: string): string {
  try {
    const u = new URL(url);
    const scheme = u.protocol.replace(":", "");
    const rest = `${u.host}${u.pathname}${u.search}${u.hash}`;
    return `intent://${rest}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch {
    return url;
  }
}

/** 今のURLに ?from=inapp を付けたもの（コピー・Chromeで開く用） */
export function withInAppMarker(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("from", "inapp");
    return u.toString();
  } catch {
    return url;
  }
}
