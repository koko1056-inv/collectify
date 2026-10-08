import { supabase } from "@/integrations/supabase/client";

/**
 * 取引の状態を変える唯一の口。
 *
 * これまでは「完了にする」処理が4箇所に散らばっていて、
 * どこからでも trade_requests.status を直に書き換えられた。
 * その結果、相手が受け取る前に片方の操作だけで取引が終わったことにできた。
 *
 * いまは全部サーバー側の関数を呼ぶ。判断はデータベースの中にしかない。
 */

export type TradeActionReason =
  | "not_found"
  | "not_receiver"
  | "not_participant"
  | "not_pending"
  | "not_accepted"
  | "not_cancellable"
  | "already_shipped"
  | "already_reported"
  | "partner_not_shipped"
  | "not_signed_in"
  | "item_not_found"
  | "not_your_item"
  | "self_trade"
  | "blocked"
  | "private_profile"
  | "offered_committed"
  | "requested_committed"
  | "duplicate"
  | "too_many_pending"
  | "item_gone"
  | "item_taken"
  | "not_completed"
  | "unknown";

export interface TradeState {
  id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "completed";
  shipping_status: string | null;
  sender_shipped: boolean;
  receiver_shipped: boolean;
  sender_received: boolean;
  receiver_received: boolean;
}

export type TradeActionResult =
  | { ok: true; state: TradeState }
  | { ok: false; reason: TradeActionReason };

/** 失敗の理由はコードで返る。表示用の文言は画面側で当てる。 */
function toResult(data: unknown, error: unknown): TradeActionResult {
  if (error || !data || typeof data !== "object") {
    console.error("trade action failed:", error);
    return { ok: false, reason: "unknown" };
  }
  const body = data as Record<string, unknown>;
  if (body.ok !== true) {
    return { ok: false, reason: (body.reason as TradeActionReason) ?? "unknown" };
  }
  return { ok: true, state: body as unknown as TradeState };
}

/**
 * 交換の申請を出す。相手の品（requestedItemId）と、差し出す自分の品（offeredItemId）を渡す。
 * 持ち主・ブロック・二重の約束はサーバーが確かめる。
 */
export async function createTradeRequest(params: {
  requestedItemId: string;
  offeredItemId: string;
  message?: string;
}): Promise<TradeActionResult> {
  const { data, error } = await supabase.rpc("create_trade_request", {
    _requested_item_id: params.requestedItemId,
    _offered_item_id: params.offeredItemId,
    _message: params.message?.trim() || undefined,
  });
  return toResult(data, error);
}

export interface ApplyTradeResult {
  ok: boolean;
  already?: boolean;
  added?: boolean;
  removed?: boolean;
  kept?: boolean;
  reason?: TradeActionReason;
}

/** 完了した交換を、自分のコレクションへ反映する（受け取った品を追加・手放した品を外す）。 */
export async function applyTradeToCollection(tradeId: string): Promise<ApplyTradeResult> {
  const { data, error } = await supabase.rpc("apply_trade_to_collection", { _trade_id: tradeId });
  if (error || !data || typeof data !== "object") {
    console.error("apply trade failed:", error);
    return { ok: false, reason: "unknown" };
  }
  const body = data as Record<string, unknown>;
  if (body.ok !== true) return { ok: false, reason: (body.reason as TradeActionReason) ?? "unknown" };
  return body as unknown as ApplyTradeResult;
}

/** 承認 / 辞退。決められるのは申し込まれた側だけ。 */
export async function respondToTradeRequest(
  tradeId: string,
  accept: boolean
): Promise<TradeActionResult> {
  const { data, error } = await supabase.rpc("respond_to_trade_request", {
    _trade_id: tradeId,
    _accept: accept,
  });
  return toResult(data, error);
}

/** 取消。まだどちらも発送していないうちだけ通る。 */
export async function cancelTradeRequest(tradeId: string): Promise<TradeActionResult> {
  const { data, error } = await supabase.rpc("cancel_trade_request", { _trade_id: tradeId });
  return toResult(data, error);
}

/** 「発送しました」。自分の側だけを報告する。 */
export async function reportTradeShipment(tradeId: string): Promise<TradeActionResult> {
  const { data, error } = await supabase.rpc("report_trade_shipment", { _trade_id: tradeId });
  return toResult(data, error);
}

/** 「受け取りました」。両方そろうと取引が完了する。 */
export async function reportTradeReceipt(tradeId: string): Promise<TradeActionResult> {
  const { data, error } = await supabase.rpc("report_trade_receipt", { _trade_id: tradeId });
  return toResult(data, error);
}

/** 失敗の理由に対応する翻訳キー。 */
export function tradeErrorKey(reason: TradeActionReason): string {
  return `trade.errors.${reason}`;
}
