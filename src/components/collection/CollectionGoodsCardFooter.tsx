import { CardFooter } from "@/components/ui/card";
import { CardActions } from "./CardActions";
import { useToggleForTrade } from "@/hooks/trade/useToggleForTrade";

interface CollectionGoodsCardFooterProps {
  id: string;
  forTrade: boolean;
  onDeleteClick: () => void;
  onCreatePostClick: () => void;
}

/**
 * 以前はカード1枚ごとに user_item_tags を引き、Realtime のチャンネルまで張っていた
 * （グリッドの枚数ぶんチャンネルができて重い）。結果はどこにも使っていなかったので外した。
 * 交換中かどうかは一覧の行（for_trade）から受け取り、切り替えは楽観的に一覧のキャッシュを書き換える。
 */
export function CollectionGoodsCardFooter({
  id,
  forTrade,
  onDeleteClick,
  onCreatePostClick,
}: CollectionGoodsCardFooterProps) {
  const toggleTrade = useToggleForTrade();

  return (
    <CardFooter className="px-0.5 py-1 border-t border-border/40 bg-muted/20">
      <CardActions
        onCreatePostClick={onCreatePostClick}
        onToggleTrade={() => toggleTrade.mutate({ itemId: id, forTrade: !forTrade })}
        onDeleteClick={onDeleteClick}
        forTrade={forTrade}
        isTradePending={toggleTrade.isPending}
      />
    </CardFooter>
  );
}
