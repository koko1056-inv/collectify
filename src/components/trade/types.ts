
export interface TradeRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  shipping_status?: 'not_shipped' | 'shipped' | 'completed';
  is_open?: boolean;
  message?: string;
  sender: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  receiver: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;  // Receiver can be null for open trades
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
