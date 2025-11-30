import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Trash2, Image as ImageIcon, Type, Sticker } from "lucide-react";
import { useState } from "react";

interface LayerItem {
  id: string;
  type: "item" | "decoration";
  decorationType?: string;
  title?: string;
  z_index: number;
  visible?: boolean;
}

interface LayersPanelProps {
  layers: LayerItem[];
  selectedIds: string[];
  onSelectLayer: (id: string, event?: React.MouseEvent) => void;
  onDeleteLayer: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onReorder?: (oldIndex: number, newIndex: number) => void;
}

export function LayersPanel({
  layers,
  selectedIds,
  onSelectLayer,
  onDeleteLayer,
  onToggleVisibility,
}: LayersPanelProps) {
  const sortedLayers = [...layers].sort((a, b) => b.z_index - a.z_index);

  const getLayerIcon = (layer: LayerItem) => {
    if (layer.type === "item") {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (layer.decorationType === "text") {
      return <Type className="w-4 h-4" />;
    }
    return <Sticker className="w-4 h-4" />;
  };

  const getLayerTitle = (layer: LayerItem, index: number) => {
    if (layer.title) return layer.title;
    if (layer.type === "item") return `アイテム ${sortedLayers.length - index}`;
    if (layer.decorationType === "text") return `テキスト ${sortedLayers.length - index}`;
    return `ステッカー ${sortedLayers.length - index}`;
  };

  return (
    <div className="w-64 bg-white border-l flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">レイヤー</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {layers.length} 個のオブジェクト
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedLayers.map((layer, index) => (
            <div
              key={layer.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                selectedIds.includes(layer.id)
                  ? "bg-primary/10 border border-primary"
                  : "hover:bg-gray-100 border border-transparent"
              }`}
              onClick={(e) => onSelectLayer(layer.id, e)}
            >
              <div className="text-muted-foreground">
                {getLayerIcon(layer)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {getLayerTitle(layer, index)}
                </p>
                <p className="text-xs text-muted-foreground">
                  z-index: {layer.z_index}
                </p>
              </div>

              <div className="flex gap-1">
                {onToggleVisibility && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                  >
                    {layer.visible !== false ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {layers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>レイヤーがありません</p>
              <p className="text-xs mt-1">アイテムを追加してください</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
