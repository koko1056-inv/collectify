
import { Calendar, Tag, Star, Icon } from "lucide-react";

interface ItemLabelValueProps {
  label: string;
  value: string;
  icon: "calendar" | "tag" | "star";
}

export function ItemLabelValue({ label, value, icon }: ItemLabelValueProps) {
  const renderIcon = () => {
    switch (icon) {
      case "calendar":
        return <Calendar className="h-4 w-4 text-gray-500" />;
      case "tag":
        return <Tag className="h-4 w-4 text-gray-500" />;
      case "star":
        return <Star className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {renderIcon()}
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}
