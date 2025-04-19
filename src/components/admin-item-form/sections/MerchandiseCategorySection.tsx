
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MERCHANDISE_CATEGORIES = [
  "フォトカード",
  "アクリルスタンド",
  "缶バッジ",
  "キーホルダー",
  "ガチャ",
  "ステッカー",
  "その他"
] as const;

interface MerchandiseCategorySectionProps {
  value: string;
  onChange: (category: string) => void;
}

export function MerchandiseCategorySection({
  value,
  onChange,
}: MerchandiseCategorySectionProps) {
  return (
    <div className="space-y-2">
      <Label>グッズカテゴリ</Label>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder="グッズカテゴリを選択" />
        </SelectTrigger>
        <SelectContent>
          {MERCHANDISE_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
