import { Calendar, Tag, Star, CircleDollarSign, Bookmark, Layers } from "lucide-react";
interface ItemLabelValueProps {
  icon: "calendar" | "tag" | "star" | "price" | "bookmark" | "layers";
  label: string;
  value: string;
}
export function ItemLabelValue({
  icon,
  label,
  value
}: ItemLabelValueProps) {
  return <div className="flex items-center gap-2 py-0">
      {icon === "calendar" && <Calendar className="h-4 w-4 text-gray-500" />}
      {icon === "tag" && <Tag className="h-4 w-4 text-gray-500" />}
      {icon === "star" && <Star className="h-4 w-4 text-gray-500" />}
      {icon === "price" && <CircleDollarSign className="h-4 w-4 text-gray-500" />}
      {icon === "bookmark" && <Bookmark className="h-4 w-4 text-gray-500" />}
      {icon === "layers" && <Layers className="h-4 w-4 text-gray-500" />}
      <div>
        <span className="text-xs text-gray-500">{label}</span>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>;
}