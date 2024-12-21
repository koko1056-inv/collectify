import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const getDisplayText = () => {
    if (value === "all") return "アニメ/アーティストから選択";
    if (value.startsWith("ip:")) {
      const ipName = value.replace("ip:", "");
      return `${ipName}`;
    }
    const [type, name] = value.split(":");
    return `${name}`;
  };

  const handleSelect = (value: string) => {
    if (value === "all") {
      navigate("/");
      onValueChange(value);
    } else {
      onValueChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          key="all"
          variant={value === "all" ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={() => handleSelect("all")}
        >
          すべて
        </Button>
        {ipList.map((ip) => (
          <Button
            key={ip}
            variant={value === `ip:${ip}` ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => handleSelect(`ip:${ip}`)}
          >
            {ip}
          </Button>
        ))}
        {mediaOptions.map((option) =>
          option.items.map((item) => (
            <Button
              key={`${option.type}:${item}`}
              variant={value === `${option.type}:${item}` ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => handleSelect(`${option.type}:${item}`)}
            >
              {item}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}