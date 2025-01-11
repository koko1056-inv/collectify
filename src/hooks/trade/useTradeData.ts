import { supabase } from "@/integrations/supabase/client";
import { TradeRequest } from "@/components/trade/types";

export async function fetchTradeData(userId: string, status?: string) {
  const query = supabase
    .from("trade_requests")
    .select(`
      id,
      message,
      status,
      sender:profiles!trade_requests_sender_id_fkey(
        id,
        username,
        display_name
      ),
      offered_item:user_items!trade_requests_offered_item_id_fkey(
        id,
        title,
        image
      ),
      requested_item:user_items!trade_requests_requested_item_id_fkey(
        id,
        title,
        image
      )
    `);

  if (status) {
    query.eq("status", status);
  }

  query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching ${status || "all"} trades:`, error);
    return [];
  }

  return data as TradeRequest[];
}