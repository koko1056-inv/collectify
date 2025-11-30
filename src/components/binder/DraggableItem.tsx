import { useState, useRef, useEffect } from "react";
import { Trash2, RotateCw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraggableItemProps {
  id: string;
  image?: string;
  content?: React.ReactNode;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  initialRotation: number;
  zIndex: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: {
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    rotation: number;
  }) => void;
  onDelete: () => void;
}

export function DraggableItem({
  id,
  image,
  content,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  initialRotation,
  zIndex,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: DraggableItemProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [rotation, setRotation] = useState(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.control-button')) return;
    
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartSize.current = { ...size };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  // マウス移動
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;
        const newWidth = Math.max(50, resizeStartSize.current.width + deltaX);
        const newHeight = Math.max(50, resizeStartSize.current.height + deltaY);
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        onUpdate({
          position_x: position.x,
          position_y: position.y,
          width: size.width,
          height: size.height,
          rotation,
        });
      }
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, position, size, rotation, onUpdate]);

  const handleRotate = () => {
    const newRotation = (rotation + 15) % 360;
    setRotation(newRotation);
    onUpdate({
      position_x: position.x,
      position_y: position.y,
      width: size.width,
      height: size.height,
      rotation: newRotation,
    });
  };

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move transition-shadow ${
        isSelected ? "ring-2 ring-primary shadow-lg" : ""
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform: `rotate(${rotation}deg)`,
        zIndex,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* アイテムコンテンツ */}
      <div className="w-full h-full relative">
        {image ? (
          <img
            src={image}
            alt="Binder item"
            className="w-full h-full object-cover rounded shadow-md border-2 border-white"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-white rounded shadow-md border-2 border-gray-200 flex items-center justify-center">
            {content}
          </div>
        )}
      </div>

      {/* コントロールボタン（選択時のみ表示） */}
      {isSelected && (
        <div className="absolute -top-12 left-0 flex gap-1 bg-white rounded-lg shadow-lg p-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 control-button"
            onClick={handleRotate}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8 control-button"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* リサイズハンドル（選択時のみ表示） */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full cursor-nwse-resize control-button"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}
