
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { Message, PartnerProfile } from "./types";

interface UseChatProps {
  partnerId: string;
  tradeRequestId?: string;
  isOpen: boolean;
}

export function useChat({ partnerId, tradeRequestId, isOpen }: UseChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [step, setStep] = useState<'chat' | 'shipping' | 'complete'>('chat');
  const [isShippingConfirmOpen, setIsShippingConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
      fetchPartnerProfile();
      subscribeToMessages();
    }
  }, [isOpen, user, partnerId, tradeRequestId]);

  const markMessagesAsRead = async () => {
    if (!user) return;

    let query = supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (tradeRequestId) {
      query = query.eq("trade_request_id", tradeRequestId);
    } else {
      query = query.eq("sender_id", partnerId).is("trade_request_id", null);
    }

    await query;
  };

  const fetchPartnerProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", partnerId)
      .single();

    if (!error && data) {
      setPartnerProfile(data);
    }
  };

  const fetchMessages = async () => {
    if (!user) return;

    let query = supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`);

    if (tradeRequestId) {
      query = query.eq('trade_request_id', tradeRequestId);
    }

    query = query.order("created_at", { ascending: true });

    const { data, error } = await query;

    if (!error && data) {
      setMessages(data);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: tradeRequestId 
            ? `trade_request_id=eq.${tradeRequestId}`
            : `sender_id=eq.${partnerId},receiver_id=eq.${user?.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return;

    const messageData = {
      sender_id: user.id,
      receiver_id: partnerId,
      content: content.trim(),
      trade_request_id: tradeRequestId
    };

    const { error } = await supabase.from("messages").insert(messageData);

    if (!error) {
      await markMessagesAsRead();
      fetchMessages();
    }
  };

  const proceedToShipping = () => {
    setStep('shipping');
  };

  const completeShipping = async () => {
    if (!tradeRequestId) return;

    const { error } = await supabase
      .from("trade_requests")
      .update({ 
        shipping_status: 'shipped',
        status: 'accepted'
      })
      .eq("id", tradeRequestId);

    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "発送状態の更新に失敗しました。",
      });
      return;
    }

    toast({
      title: "発送完了",
      description: "発送状態を更新しました。",
    });

    setIsShippingConfirmOpen(false);
    setStep('complete');
  };

  const completeTrade = async () => {
    if (!tradeRequestId) return;
    
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("trade_requests")
        .update({ status: "completed" })
        .eq("id", tradeRequestId);

      if (error) {
        throw error;
      }

      toast({
        title: "トレード完了",
        description: "トレードが完了しました。お疲れ様でした！",
      });
    } catch (error) {
      console.error("Error completing trade:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "トレードの完了に失敗しました。",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return {
    messages,
    partnerProfile,
    step,
    isCompleting,
    isShippingConfirmOpen,
    setIsShippingConfirmOpen,
    sendMessage,
    proceedToShipping,
    completeShipping,
    completeTrade
  };
}
