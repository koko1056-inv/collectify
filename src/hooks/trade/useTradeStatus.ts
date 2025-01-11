import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useTradeStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateTradeStatus = async (tradeId: string, status: 'accepted' | 'rejected' | 'completed' | 'cancelled') => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("trade_requests")
        .update({ status })
        .eq("id", tradeId);

      if (error) {
        throw error;
      }

      const statusMessages = {
        accepted: "トレードリクエストを承認しました",
        rejected: "トレードリクエストを拒否しました",
        completed: "トレードが完了しました",
        cancelled: "トレードをキャンセルしました"
      };

      toast({
        title: "更新完了",
        description: statusMessages[status],
      });

      return true;
    } catch (error) {
      console.error(`Error updating trade status to ${status}:`, error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "トレードステータスの更新に失敗しました",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    isUpdating,
    updateTradeStatus
  };
}