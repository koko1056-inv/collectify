
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";

interface ShippingStepProps {
  onShippingComplete: () => void;
}

export function ShippingStep({ onShippingComplete }: ShippingStepProps) {
  const HEADQUARTERS_ADDRESS = "〒602-8061\n京都府京都市上京区甲斐守町97 109\ncollectify 運営本部";

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-4">
        <h3 className="font-medium">郵送手続き</h3>
        <p className="text-sm text-gray-500">
          以下の手順で郵送手続きを進めてください：
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>運営本部へ商品を郵送してください</li>
          <li>運営本部で商品の確認を行います</li>
          <li>確認後、運営本部からトレード相手に商品を郵送します</li>
          <li>トレード相手への配送が完了次第、取引完了となります</li>
        </ol>
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">運営本部 郵送先住所</h4>
          <p className="text-sm whitespace-pre-line">{HEADQUARTERS_ADDRESS}</p>
        </div>
        <Button 
          onClick={onShippingComplete} 
          className="w-full mt-4"
          variant="secondary"
        >
          <Truck className="mr-2 h-4 w-4" />
          運営本部への発送完了
        </Button>
      </div>
    </div>
  );
}
