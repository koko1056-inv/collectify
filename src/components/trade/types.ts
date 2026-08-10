export interface TradeParty {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface TradeRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  shipping_status?: 'not_shipped' | 'shipped' | 'completed' | null;
  is_open?: boolean;
  message?: string | null;
  created_at?: string;
  /**
   * 発送と受取は、当事者それぞれが自分の側だけを報告する。
   * 相手の代わりに押すことはできない。両方の受取がそろって初めて完了になる。
   */
  sender_shipped_at?: string | null;
  receiver_shipped_at?: string | null;
  sender_received_at?: string | null;
  receiver_received_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  sender: TradeParty;
  receiver: TradeParty | null;
  offered_item: {
    id: string;
    title: string;
    image: string;
  };
  requested_item: {
    id: string;
    title: string;
    image: string;
  };
}

/** 自分から見た、この取引での立場と進み具合 */
export interface TradeViewpoint {
  isSender: boolean;
  partner: TradeParty | null;
  iShipped: boolean;
  partnerShipped: boolean;
  iReceived: boolean;
  partnerReceived: boolean;
}

export function viewpointOf(trade: TradeRequest, userId: string | undefined): TradeViewpoint {
  const isSender = trade.sender?.id === userId;
  return {
    isSender,
    partner: isSender ? trade.receiver : trade.sender,
    iShipped: !!(isSender ? trade.sender_shipped_at : trade.receiver_shipped_at),
    partnerShipped: !!(isSender ? trade.receiver_shipped_at : trade.sender_shipped_at),
    iReceived: !!(isSender ? trade.sender_received_at : trade.receiver_received_at),
    partnerReceived: !!(isSender ? trade.receiver_received_at : trade.sender_received_at),
  };
}

/**
 * 承認から日が経っているのに動きがない取引。
 * 放置されたまま一覧の下に埋もれると、送った側が泣き寝入りすることになる。
 */
export const STALE_TRADE_DAYS = 14;

export function isStalled(trade: TradeRequest): boolean {
  if (trade.status !== 'accepted') return false;
  const base = trade.created_at;
  if (!base) return false;
  const days = (Date.now() - new Date(base).getTime()) / (1000 * 60 * 60 * 24);
  return days >= STALE_TRADE_DAYS;
}
