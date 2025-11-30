
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useSimilarItemsCheck } from '@/hooks/admin-item-form/useSimilarItemsCheck';
import { cn } from '@/lib/utils';

interface TitleSectionProps {
  title: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function TitleSection({
  title,
  onChange,
}: TitleSectionProps) {
  const { similarItems, isChecking } = useSimilarItemsCheck(title);
  const hasSimilarItems = similarItems.length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="title" className="text-sm font-medium">タイトル</Label>
      <div className="relative">
        <Input
          id="title"
          name="title"
          value={title}
          onChange={onChange}
          placeholder="アイテム名を入力"
          required
          className={cn(
            "font-medium text-lg",
            hasSimilarItems && "border-yellow-500 focus-visible:ring-yellow-500"
          )}
        />
        {isChecking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {hasSimilarItems && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="font-semibold mb-2">似たようなグッズが既に登録されています:</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {similarItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-3 p-2 bg-white rounded border border-yellow-200"
                >
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <span className="text-sm text-gray-700 flex-1">{item.title}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2 text-yellow-700">
              重複登録を避けるため、既存のグッズではないことを確認してください。
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
