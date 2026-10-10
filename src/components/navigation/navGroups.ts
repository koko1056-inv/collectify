/**
 * 下タブ（モバイル）とヘッダーのナビ（デスクトップ）で、どの画面をどのタブとして点灯させるか。
 * どの画面にいても、5つのタブのどれかが点灯するようにする（以前は点灯しない画面が多かった）。
 */
export const NAV_GROUPS: Record<string, string[]> = {
  "/collection": ["/collection", "/oshi", "/add-item", "/quick-add", "/image-search"],
  "/trade": ["/trade", "/messages"],
  "/explore": ["/explore", "/search", "/item-posts", "/post", "/posts", "/user", "/room", "/rooms", "/ai-work", "/ai-avatar", "/item"],
  // /my-room と /ai-rooms はどちらも AI スタジオに着くので同じタブ扱いにする
  "/my-room": ["/my-room", "/ai-rooms", "/edit-profile", "/point-shop", "/points", "/how-to-use"],
};

export function isNavActive(to: string, pathname: string): boolean {
  return (NAV_GROUPS[to] ?? [to]).some((p) => pathname === p || pathname.startsWith(p + "/"));
}
