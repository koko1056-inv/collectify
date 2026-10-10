
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useSimilarItemsCheck } from '@/hooks/admin-item-form/useSimilarItemsCheck';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface TitleSectionProps {
  title: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function TitleSection({
  title,
  onChange,
}: TitleSectionProps) {
  const { t } = useLanguage();
  const { similarItems, isChecking } = useSimilarItemsCheck(title);
  const hasSimilarItems = similarItems.length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="title" className="text-sm font-medium">{t("misc.itemForm.titleLabel")}</Label>
      <div className="relative">
        <Input
          id="title"
          name="title"
          value={title}
          onChange={onChange}
          placeholder={t("misc.itemForm.titlePlaceholder")}
          required
          className={cn(
            "font-medium text-lg",
            hasSimilarItems && "border-warning/50 focus-visible:ring-warning"
          )}
        />
        {isChecking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {hasSimilarItems && (
        <Alert className="border-warning/50 bg-warning-soft">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            <div className="font-bold mb-2">{t("misc.itemForm.similarHeading")}</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {similarItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-3 p-2 bg-card rounded border border-warning/30"
                >
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <span className="text-sm text-foreground flex-1">{item.title}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2 text-warning">
              {t("misc.itemForm.similarNote")}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
