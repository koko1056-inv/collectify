
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getGroupItemCount } from "@/utils/tag/user-groups";
import { GroupInfo } from "@/utils/tag/types";
import { FolderOpen, Palette } from "lucide-react";

// 選択可能な色の配列
export const groupColorOptions = [
  { name: "ピンク", value: "bg-pink-100 border-pink-200 hover:bg-pink-50" },
  { name: "ブルー", value: "bg-blue-100 border-blue-200 hover:bg-blue-50" },
  { name: "グリーン", value: "bg-green-100 border-green-200 hover:bg-green-50" },
  { name: "パープル", value: "bg-purple-100 border-purple-200 hover:bg-purple-50" },
  { name: "イエロー", value: "bg-yellow-100 border-yellow-200 hover:bg-yellow-50" },
  { name: "インディゴ", value: "bg-indigo-100 border-indigo-200 hover:bg-indigo-50" },
  { name: "レッド", value: "bg-red-100 border-red-200 hover:bg-red-50" },
  { name: "オレンジ", value: "bg-orange-100 border-orange-200 hover:bg-orange-50" },
  { name: "ティール", value: "bg-teal-100 border-teal-200 hover:bg-teal-50" },
  { name: "ライム", value: "bg-lime-100 border-lime-200 hover:bg-lime-50" },
  { name: "グレー", value: "bg-gray-100 border-gray-200 hover:bg-gray-50" },
  { name: "スカイ", value: "bg-sky-100 border-sky-200 hover:bg-sky-50" }
];

// デフォルトカラー
const defaultColor = "bg-blue-100 border-blue-200 hover:bg-blue-50";

interface GroupCardProps {
  group: GroupInfo;
  isSelected: boolean;
  onClick: () => void;
  onColorChange?: (groupId: string, color: string) => void;
}

export function GroupCard({ group, isSelected, onClick, onColorChange }: GroupCardProps) {
  const [itemCount, setItemCount] = useState<number>(group.itemCount || 0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  useEffect(() => {
    if (group.id) {
      const fetchItemCount = async () => {
        const count = await getGroupItemCount(group.id);
        setItemCount(count);
      };
      
      fetchItemCount();
    }
  }, [group.id]);

  const handleColorClick = (e: React.MouseEvent, color: string) => {
    e.stopPropagation();
    if (onColorChange) {
      console.log("Color selected:", color);
      onColorChange(group.id, color);
    }
    setShowColorPicker(false);
  };

  const handleColorPickerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowColorPicker(prev => !prev);
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected 
          ? "ring-2 ring-primary ring-offset-2" 
          : "hover:shadow-md hover:scale-105"
      } ${group.color || defaultColor}`}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-800 line-clamp-1">{group.name}</h3>
        </div>
        
        {onColorChange && (
          <div className="relative">
            <button 
              onClick={handleColorPickerToggle}
              className="p-1 rounded-full hover:bg-white/50"
            >
              <Palette className="h-4 w-4 text-gray-500" />
            </button>
            
            {showColorPicker && (
              <div 
                className="absolute right-0 top-full mt-1 p-2 bg-white rounded-md shadow-lg z-10 grid grid-cols-4 gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {groupColorOptions.map((color, index) => (
                  <div
                    key={index}
                    className={`w-6 h-6 rounded-full cursor-pointer ${color.value.split(' ')[0]}`}
                    title={color.name}
                    onClick={(e) => handleColorClick(e, color.value)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 pt-1">
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
