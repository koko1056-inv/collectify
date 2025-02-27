
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface CompleteStepProps {
  onComplete: () => Promise<void>;
  isCompleting: boolean;
}

export function CompleteStep({ onComplete, isCompleting }: CompleteStepProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-4">
        <h3 className="font-medium">トレード完了</h3>
        <p className="text-sm text-gray-500">
          発送手続きが完了しました。トレードを完了してよろしいですか？
        </p>
        <Button 
          onClick={onComplete} 
          disabled={isCompleting}
          className="w-full"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          トレードを完了する
        </Button>
      </div>
    </div>
  );
}
