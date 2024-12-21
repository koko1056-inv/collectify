import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <Button
          key="all"
          variant={value === "all" ? "default" : "outline"}
          className="h-auto py-2"
          onClick={() => handleSelect("all")}
        >
          すべて
        </Button>
        {ipList.map((ip) => (
          <Button
            key={ip}
            variant={value === `ip:${ip}` ? "default" : "outline"}
            className="h-auto py-2"
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
              className="h-auto py-2"
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