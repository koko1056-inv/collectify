
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
  };
  receiver: {
    id: string;
    username: string;
    display_name?: string | null;
  };
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
