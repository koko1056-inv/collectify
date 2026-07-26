
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CompleteStepProps {
  onComplete: () => Promise<void>;
  isCompleting: boolean;
}

export function CompleteStep({ onComplete, isCompleting }: CompleteStepProps) {
  const { t } = useLanguage();

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-4">
        <h3 className="font-medium">{t("social.chat.completeTitle")}</h3>
        <p className="text-sm text-gray-500">
          {t("social.chat.completeDesc")}
        </p>
        <Button 
          onClick={onComplete} 
          disabled={isCompleting}
          className="w-full"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {t("social.chat.completeButton")}
        </Button>
      </div>
    </div>
  );
}
