
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShippingStepProps {
  onShippingComplete: () => void;
}

export function ShippingStep({ onShippingComplete }: ShippingStepProps) {
  const { t } = useLanguage();
  const HEADQUARTERS_ADDRESS = "〒602-8061\n京都府京都市上京区甲斐守町97 109\ncollectify 運営本部";

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-4">
        <h3 className="font-medium">{t("social.chat.shippingTitle")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("social.chat.shippingIntro")}
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>{t("social.chat.shippingStep1")}</li>
          <li>{t("social.chat.shippingStep2")}</li>
          <li>{t("social.chat.shippingStep3")}</li>
          <li>{t("social.chat.shippingStep4")}</li>
        </ol>
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">{t("social.chat.shippingAddressTitle")}</h4>
          <p className="text-sm whitespace-pre-line">{HEADQUARTERS_ADDRESS}</p>
        </div>
        <Button 
          onClick={onShippingComplete} 
          className="w-full mt-4"
          variant="secondary"
        >
          <Truck className="mr-2 h-4 w-4" />
          {t("social.chat.shippingDoneButton")}
        </Button>
      </div>
    </div>
  );
}
