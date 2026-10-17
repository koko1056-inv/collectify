import type { OfficialItem } from "@/types";

/**
 * ログインせずに試したときの「おためしの袋」。この端末にだけ置き、登録（ログイン）したらコレクションへ移す（GuestPouchImporter）。
 * 中身は公式グッズの最小限（あとでまとめて登録するのに要るものだけ）
 */
export interface GuestItem {
  id: string;
  title: string;
  image: string;
  content_name: string | null;
  release_date: string | null;
  price: string | null;
}

interface GuestPouch {
  owned: GuestItem[];
  wished: GuestItem[];
}

const KEY = "guest_pouch_v1";
/** 試しで入れられる数（登録するときの一括追加の上限より十分小さく） */
export const GUEST_POUCH_MAX = 60;

export function readGuestPouch(): GuestPouch {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { owned: [], wished: [] };
    const v = JSON.parse(raw) as Partial<GuestPouch>;
    return { owned: v.owned ?? [], wished: v.wished ?? [] };
  } catch {
    return { owned: [], wished: [] };
  }
}

export function writeGuestPouch(p: GuestPouch) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 保存できなくても、この画面の中では試せる */
  }
}

export function clearGuestPouch() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 消せなくても、次に移すときに重複は除かれる */
  }
}

export const toGuestItem = (item: OfficialItem): GuestItem => ({
  id: item.id,
  title: item.title,
  image: item.image,
  content_name: item.content_name ?? null,
  release_date: item.release_date ?? null,
  price: item.price ?? null,
});
