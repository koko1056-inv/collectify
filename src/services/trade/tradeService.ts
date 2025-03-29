
import { supabase } from "@/integrations/supabase/client";
import { TradeRequest } from "@/components/trade/types";
import { Profile } from "@/types";

// Common trade request select query
const tradeRequestSelectQuery = `
  id,
  message,
  status,
  shipping_status,
  is_open,
  sender:profiles!trade_requests_sender_id_fkey(
    id,
    username,
    display_name,
    avatar_url
  ),
  receiver:profiles!trade_requests_receiver_id_fkey(
    id,
    username,
    display_name,
    avatar_url
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
`;

/**
 * Fetch pending trade requests for a user
 */
export const fetchPendingTradeRequests = async (userId: string): Promise<TradeRequest[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("trade_requests")
    .select(tradeRequestSelectQuery)
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .or(`is_open.is.null, is_open.is.false`) // Only include non-open trades or where is_open is null
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching trade requests:", error);
    return [];
  }

  return data as TradeRequest[];
};

/**
 * Fetch accepted trade requests for a user
 */
export const fetchAcceptedTradeRequests = async (userId: string): Promise<TradeRequest[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("trade_requests")
    .select(tradeRequestSelectQuery)
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching accepted trades:", error);
    return [];
  }

  return data as TradeRequest[];
};

/**
 * Fetch completed trade requests for a user
 */
export const fetchCompletedTradeRequests = async (userId: string): Promise<TradeRequest[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("trade_requests")
    .select(tradeRequestSelectQuery)
    .eq("status", "completed")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching completed trades:", error);
    return [];
  }

  return data as TradeRequest[];
};

/**
 * Fetch open trade requests
 */
export const fetchOpenTradeRequests = async (userId: string): Promise<TradeRequest[]> => {
  if (!userId) return [];
  
  try {
    console.log("Fetching open trade requests for user:", userId);
    const { data, error } = await supabase
      .from("trade_requests")
      .select(tradeRequestSelectQuery)
      .eq("is_open", true)
      .eq("status", "pending")
      .neq("sender_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching open trades:", error);
      return [];
    }

    console.log("Fetched open trade requests:", data);
    return data as TradeRequest[];
  } catch (error) {
    console.error("Error in fetchOpenTradeRequests:", error);
    return [];
  }
};

/**
 * Update trade request status
 */
export const updateTradeRequestStatus = async (
  tradeId: string, 
  status: 'accepted' | 'rejected' | 'completed'
): Promise<boolean> => {
  const { error } = await supabase
    .from("trade_requests")
    .update({ status })
    .eq("id", tradeId);

  if (error) {
    console.error("Error updating trade request status:", error);
    return false;
  }
  
  return true;
};

/**
 * Create initial trade messages
 */
export const createTradeMessages = async (
  tradeId: string,
  senderId: string,
  receiverId: string,
  offeredItemTitle: string,
  requestedItemTitle: string
): Promise<boolean> => {
  const { error } = await supabase
    .from("messages")
    .insert([
      {
        sender_id: receiverId,
        receiver_id: senderId,
        content: `トレードが承認されました。「${offeredItemTitle}」と「${requestedItemTitle}」の交換について詳細を決めましょう。`,
        trade_request_id: tradeId
      },
      {
        sender_id: senderId,
        receiver_id: receiverId,
        content: `あなたのトレードリクエストが承認されました。「${offeredItemTitle}」と「${requestedItemTitle}」の交換を進めましょう。`,
        trade_request_id: tradeId
      }
    ]);

  if (error) {
    console.error("Error creating trade messages:", error);
    return false;
  }

  return true;
};
