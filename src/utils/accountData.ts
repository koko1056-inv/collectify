// アカウントまわりの Edge Function 呼び出し（データの書き出し・退会）。
// 画面側はエラーコードだけを見て翻訳済みの文言を出す。

import { supabase } from "@/integrations/supabase/client";

export type AccountErrorCode =
  | "login_required"
  | "confirmation_required"
  | "admin_cannot_delete"
  | "subscription_cancel_failed"
  | "stripe_not_configured"
  | "storage_cleanup_failed"
  | "export_failed"
  | "unknown";

const KNOWN_CODES: AccountErrorCode[] = [
  "login_required",
  "confirmation_required",
  "admin_cannot_delete",
  "subscription_cancel_failed",
  "stripe_not_configured",
  "storage_cleanup_failed",
  "export_failed",
];

export class AccountError extends Error {
  constructor(public code: AccountErrorCode) {
    super(code);
    this.name = "AccountError";
  }
}

async function call<T>(fn: "delete-account" | "export-my-data", body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  // 4xx/5xx のときも本文に { error: code } が入っているので、そこからコードを取り出す
  let code: string | undefined = (data as { error?: string } | null)?.error;
  if (error && !code) {
    try {
      const res = (error as { context?: Response }).context;
      if (res && typeof res.json === "function") code = (await res.json())?.error;
    } catch {
      /* 本文が読めなければ unknown */
    }
  }
  if (error || code) {
    console.error(`[${fn}] failed:`, code ?? error);
    throw new AccountError(KNOWN_CODES.includes(code as AccountErrorCode) ? (code as AccountErrorCode) : "unknown");
  }
  return data as T;
}

/** 自分のデータを JSON として取得する */
export function fetchMyData(): Promise<unknown> {
  return call<unknown>("export-my-data", {});
}

/** JSON を端末に保存させる */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export interface DeleteAccountResult {
  success: boolean;
  /** 例: "store_subscription_active"（App Store / Google Play の購読は、ストア側で解約が必要） */
  warnings: string[];
}

/** 退会する。確認文字列 "DELETE" をサーバーにも渡す（誤操作防止の二重チェック） */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const res = await call<Partial<DeleteAccountResult>>("delete-account", { confirm: "DELETE" });
  return { success: res?.success === true, warnings: res?.warnings ?? [] };
}
