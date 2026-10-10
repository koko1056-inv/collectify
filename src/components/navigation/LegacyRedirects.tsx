import { Navigate, useLocation } from "react-router-dom";

/** /edit-profile（自分のプロフィール）→ /me。?settings=1 などはそのまま渡す */
export function EditProfileRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/me${search}`} replace />;
}

/**
 * /my-room（旧マイルーム）→ /me の「AI作品」タブ。
 * 旧 ?tab=avatar はアバター表示に、?from=（AIで作るの起点）はそのまま渡してウィザードを開かせる。
 */
export function MyRoomRedirect() {
  const { search } = useLocation();
  const old = new URLSearchParams(search);
  const next = new URLSearchParams({ tab: "ai" });
  if (old.get("tab") === "avatar") next.set("view", "avatar");
  const from = old.get("from");
  if (from) next.set("from", from);
  return <Navigate to={`/me?${next.toString()}`} replace />;
}
