import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  RotateCw, 
  Copy, 
  ArrowUp, 
  ArrowDown,
  Move,
  Maximize2,
  RotateCcw,
  X
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface MobileItemControlsProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onRotate: (angle: number) => void;
  onResize: (scale: number) => void;
  currentRotation: number;
  currentScale: number;
}

export function MobileItemControls({
  isOpen,
  onClose,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onRotate,
  onResize,
  currentRotation,
  currentScale,
}: MobileItemControlsProps) {
  const [rotation, setRotation] = useState(currentRotation);
  const [scale, setScale] = useState(currentScale);

  const handleRotationChange = (value: number[]) => {
    setRotation(value[0]);
    onRotate(value[0]);
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0]);
    onResize(value[0]);
  };

  const quickRotate = (degrees: number) => {
    const newRotation = (rotation + degrees) % 360;
    setRotation(newRotation);
    onRotate(newRotation);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] p-0">
        <div className="p-4 space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between pb-3 border-b">
            <h3 className="font-semibold text-lg">アイテム編集</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* クイックアクション */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">クイックアクション</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="h-16 flex flex-col gap-1"
                onClick={() => quickRotate(90)}
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-xs">90°回転</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col gap-1"
                onClick={() => quickRotate(-90)}
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-xs">-90°回転</span>
              </Button>
              {onDuplicate && (
                <Button
                  variant="outline"
                  className="h-16 flex flex-col gap-1"
                  onClick={onDuplicate}
                >
                  <Copy className="w-5 h-5" />
                  <span className="text-xs">複製</span>
                </Button>
              )}
              <Button
                variant="outline"
                className="h-16 flex flex-col gap-1 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-xs">削除</span>
              </Button>
            </div>
          </div>

          {/* 回転調整 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                回転角度
              </Label>
              <span className="text-sm text-muted-foreground">{Math.round(rotation)}°</span>
            </div>
            <Slider
              value={[rotation]}
              onValueChange={handleRotationChange}
              min={0}
              max={360}
              step={1}
              className="touch-manipulation"
            />
          </div>

          {/* サイズ調整 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Maximize2 className="w-4 h-4" />
                サイズ
              </Label>
              <span className="text-sm text-muted-foreground">{Math.round(scale * 100)}%</span>
            </div>
            <Slider
              value={[scale]}
              onValueChange={handleScaleChange}
              min={0.5}
              max={2}
              step={0.1}
              className="touch-manipulation"
            />
          </div>

          {/* レイヤー操作 */}
          {(onBringForward || onSendBackward) && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">レイヤー順序</Label>
              <div className="grid grid-cols-2 gap-2">
                {onBringForward && (
                  <Button
                    variant="outline"
                    className="h-12 flex items-center gap-2"
                    onClick={onBringForward}
                  >
                    <ArrowUp className="w-4 h-4" />
                    前面へ
                  </Button>
                )}
                {onSendBackward && (
                  <Button
                    variant="outline"
                    className="h-12 flex items-center gap-2"
                    onClick={onSendBackward}
                  >
                    <ArrowDown className="w-4 h-4" />
                    背面へ
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
