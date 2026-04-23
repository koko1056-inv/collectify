/**
 * シェア用URLとテキストの統一ヘルパー。
 *
 * - SNSに貼るURLは Edge Function 経由 (`/functions/v1/og-image?...`) にする
 *   → SNSクローラーには動的OGP（タイトル・画像・説明）を返す
 *   → 人間アクセスは即座に本来のページへリダイレクト
 * - シェアテキストは煽り＋数字＋ハッシュタグ入りで拡散しやすく
 */
import { SUPABASE_URL } from "@/integrations/supabase/client";

const APP_URL = "https://collectify.lovable.app";
const OG_ENDPOINT = `${SUPABASE_URL}/functions/v1/og-image`;

export type ShareTarget =
  | { type: "room"; id: string; ownerName?: string; itemCount?: number }
  | { type: "user"; id: string; name?: string; itemCount?: number }
  | { type: "post"; id: string; ownerName?: string }
  | { type: "display"; id: string; ownerName?: string };

/** SNS シェア用のURL（OGP動的生成エンドポイント経由） */
export function buildShareUrl(target: ShareTarget): string {
  return `${OG_ENDPOINT}?type=${target.type}&id=${encodeURIComponent(target.id)}`;
}

/** 直接アクセス用のURL（アプリ内リンクや「URLをコピー」用） */
export function buildAppUrl(target: ShareTarget): string {
  switch (target.type) {
    case "room":
      return `${APP_URL}/room/${target.id}`;
    case "user":
      return `${APP_URL}/user/${target.id}`;
    case "post":
      return `${APP_URL}/post/${target.id}`;
    case "display":
      return `${APP_URL}/user/${target.id}`;
  }
}

/** 拡散しやすいシェア文言を生成 */
export function buildShareText(target: ShareTarget): string {
  const url = buildShareUrl(target);
  switch (target.type) {
    case "room": {
      const owner = target.ownerName || "コレクター";
      const count = target.itemCount;
      const stats = count && count > 0 ? `🌟グッズ${count}個展示中` : "";
      return `${owner}さんの推し部屋 ${stats}\n推し活を見える化するアプリ #Collectify\n${url}`;
    }
    case "user": {
      const name = target.name || "コレクター";
      const count = target.itemCount;
      const stats = count && count > 0 ? `📦${count}個のコレクション` : "";
      return `${name}さんのコレクション ${stats}\n#Collectify #推し活\n${url}`;
    }
    case "post": {
      const owner = target.ownerName || "誰か";
      return `${owner}さんの推しグッズ投稿✨\n#Collectify #推し活\n${url}`;
    }
    case "display": {
      const owner = target.ownerName || "コレクター";
      return `${owner}さんのグッズ展示✨\nあなたも推しを飾ろう #Collectify\n${url}`;
    }
  }
}

/** 招待リンク（既に Login が `?invite=` を解釈する実装あり） */
export function buildInviteUrl(code: string): string {
  return `${APP_URL}/invite/${code}`;
}

/** 招待用のシェア文言 */
export function buildInviteShareText(code: string): string {
  return `Collectifyで一緒に推しグッズを管理しよう！\n登録するとお互い50ポイントもらえる🎁\n${buildInviteUrl(code)}`;
}
