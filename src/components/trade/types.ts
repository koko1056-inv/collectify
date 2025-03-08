
export interface TradeRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  shipping_status?: 'not_shipped' | 'shipped';
  is_open?: boolean;
  message?: string;
  sender: {
    id: string;
    username: string;
    display_name?: string;
  };
  receiver: {
    id: string;
    username: string;
    display_name?: string;
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
