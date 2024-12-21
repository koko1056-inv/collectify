import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MediaSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  ipList: string[];
  mediaOptions: {
    type: string;
    label: string;
    items: string[];
  }[];
}

export function MediaSelector({
  value,
  onValueChange,
  ipList,
  mediaOptions,
}: MediaSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="アーティスト/アニメで絞り込む" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">すべて表示</SelectItem>
        <SelectItem value="header" className="font-semibold">
          人気IP
        </SelectItem>
        {ipList.map((item) => (
          <SelectItem key={`ip:${item}`} value={`ip:${item}`}>
            {item}
          </SelectItem>
        ))}
        {mediaOptions.map(({ type, label, items }) => (
          <React.Fragment key={type}>
            <SelectItem value={`${type}:header`} className="font-semibold">
              {label}
            </SelectItem>
            {items.map((item) => (
              <SelectItem key={`${type}:${item}`} value={`${type}:${item}`}>
                {item}
              </SelectItem>
            ))}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}