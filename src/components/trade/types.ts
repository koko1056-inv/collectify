export interface TradeRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    display_name: string | null;
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
  message: string | null;
  status: string;
}