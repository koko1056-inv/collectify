
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getGroupItemCount } from "@/utils/tag/user-groups";
import { GroupInfo } from "@/utils/tag/types";
import { FolderOpen } from "lucide-react";

// 各グループにランダムなパステルカラーを割り当てる配列
const pastelColors = [
  "bg-pink-100 border-pink-200", 
  "bg-blue-100 border-blue-200",
  "bg-green-100 border-green-200",
  "bg-purple-100 border-purple-200",
  "bg-yellow-100 border-yellow-200",
  "bg-indigo-100 border-indigo-200",
  "bg-red-100 border-red-200",
  "bg-orange-100 border-orange-200"
];

interface GroupCardProps {
  group: GroupInfo;
  isSelected: boolean;
  onClick: () => void;
}

export function GroupCard({ group, isSelected, onClick }: GroupCardProps) {
  const [itemCount, setItemCount] = useState<number>(group.itemCount || 0);
  const [colorIndex] = useState(Math.floor(Math.random() * pastelColors.length));
  
  useEffect(() => {
    if (group.id) {
      const fetchItemCount = async () => {
        const count = await getGroupItemCount(group.id);
        setItemCount(count);
      };
      
      fetchItemCount();
    }
  }, [group.id]);

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? "ring-2 ring-primary ring-offset-2" 
          : "hover:scale-105"
      } ${pastelColors[colorIndex]}`}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center space-x-2">
        <FolderOpen className="h-6 w-6 text-gray-600" />
        <h3 className="font-medium text-gray-800 line-clamp-1">{group.name}</h3>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {group.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{group.description}</p>
        )}
        
        <Badge variant="outline" className="bg-white/70">
          {itemCount}アイテム
        </Badge>
      </CardContent>
    </Card>
  );
}
