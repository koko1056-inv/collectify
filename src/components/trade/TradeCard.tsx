import React from "react";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { TradeCardMessage } from "./TradeCardMessage";

interface TradeCardProps {
  trade: TradeRequest;
  isPending?: boolean;
  isCompleted?: boolean;
  onAccept?: (tradeId: string) => void;
  onReject?: (tradeId: string) => void;
  onOpenChat?: (trade: TradeRequest) => void;
}

export function TradeCard({ 
  trade, 
  isPending, 
  isCompleted,
  onAccept, 
  onReject, 
  onOpenChat 
}: TradeCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {trade.sender.display_name || trade.sender.username}
        </span>
        <span className="text-sm text-gray-500">
          {isPending ? "からのリクエスト" : isCompleted ? "とのトレード（完了）" : "とのトレード"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">提供アイテム:</p>
          <img
            src={trade.offered_item.image}
            alt={trade.offered_item.title}
            className="w-full aspect-square object-cover rounded-md"
          />
          <p className="text-sm truncate">{trade.offered_item.title}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">リクエストアイテム:</p>
          <img
            src={trade.requested_item.image}
            alt={trade.requested_item.title}
            className="w-full aspect-square object-cover rounded-md"
          />
          <p className="text-sm truncate">{trade.requested_item.title}</p>
        </div>
      </div>
      {trade.message && (
        <div className="text-sm bg-gray-50 rounded p-2">
          {trade.message}
        </div>
      )}
      {isPending ? (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onReject?.(trade.id)}
          >
            拒否
          </Button>
          <Button
            onClick={() => onAccept?.(trade.id)}
          >
            承認
          </Button>
        </div>
      ) : !isCompleted && (
        <Button
          className="w-full relative"
          onClick={() => onOpenChat?.(trade)}
        >
          チャットを開く
          <TradeCardMessage tradeId={trade.id} />
        </Button>
      )}
    </div>
  );
}