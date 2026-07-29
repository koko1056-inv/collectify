/**
 * 共有まわりの共通処理。
 *
 * これまでは画像そのもののURL（Supabase ストレージの直リンク）を共有していた。
 * 受け取った人にはストレージ上の画像が1枚見えるだけで、
 * アプリの名前も、開ける入口も、作った人も分からない。
 * つまり拡散しても新しい利用者に繋がらない。
 *
 * そこで「アプリ内の作品ページのURL」を共有する。
 * 画像ファイルも一緒に渡せる端末では画像も添えて、
 * SNSの投稿に絵が出るようにする（URLは本文に必ず残す）。
 */

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

interface ShareContentInput {
  /** 共有シートのタイトル（対応する端末のみ使われる） */
  title?: string;
  /** 本文。URLは呼び出し側で入れなくてよい（ここで必ず末尾に付ける） */
  text: string;
  /** 共有したいアプリ内ページの絶対URL */
  url: string;
  /** 添付したい画像のURL。取得できないときは黙って本文だけ共有する */
  imageUrl?: string | null;
  /** 添付ファイル名 */
  fileName?: string;
}

/** アプリ内の作品ページの絶対URLを作る */
export function buildWorkUrl(kind: "ai-work" | "ai-avatar" | "post", id: string): string {
  return `${window.location.origin}/${kind}/${id}`;
}

/**
 * 画像を File にする。CORS などで取得できないことがあるので、
 * 失敗しても共有そのものは続けられるよう null を返す。
 */
async function toFile(imageUrl: string, fileName: string): Promise<File | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return new File([blob], fileName, { type: blob.type });
  } catch {
    return null;
  }
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/**
 * 共有する。結果を返すので、呼び出し側が文言を出し分けられる。
 * - "shared"    共有シートで送れた
 * - "copied"    共有シートが無いのでURLをコピーした
 * - "cancelled" 利用者が共有シートを閉じた（何も出さないのが正しい）
 * - "failed"    それ以外の失敗（呼び出し側でエラーを伝える）
 */
export async function shareContent({
  title,
  text,
  url,
  imageUrl,
  fileName = "collectify.png",
}: ShareContentInput): Promise<ShareResult> {
  // 画像を添えると url フィールドが無視される端末があるため、
  // リンクは必ず本文の中に入れておく。
  const body = `${text}\n${url}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    if (imageUrl) {
      const file = await toFile(imageUrl, fileName);
      if (file && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title, text: body, files: [file] });
          return "shared";
        } catch (e) {
          if (isAbort(e)) return "cancelled";
          // 画像付きが弾かれることがあるので、本文だけでもう一度試す
        }
      }
    }
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
      // 共有シートが使えなければコピーに落とす
    }
  }

  try {
    await navigator.clipboard.writeText(body);
    return "copied";
  } catch {
    return "failed";
  }
}
