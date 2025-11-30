import { useState, useRef, useEffect } from "react";
import { Trash2, RotateCw, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileItemControls } from "./MobileItemControls";

interface ResizableRotatableItemProps {
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
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: {
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    rotation: number;
  }) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
}

export function ResizableRotatableItem({
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
  onDuplicate,
  onBringForward,
  onSendBackward,
}: ResizableRotatableItemProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [rotation, setRotation] = useState(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const rotateStartAngle = useRef(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [showMobileControls, setShowMobileControls] = useState(false);

  // モバイルタッチイベントのサポート
  const getTouchPosition = (e: TouchEvent | React.TouchEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e;
    return { x: touch.clientX, y: touch.clientY };
  };

  // ドラッグ開始（マウス）
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.control-button, .resize-handle, .rotate-handle')) return;
    
    e.stopPropagation();
    onSelect(e);
    
    if (isMobile) {
      // モバイルではコントロールパネルを表示
      setShowMobileControls(true);
      return;
    }
    
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // タッチ開始
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.control-button, .resize-handle, .rotate-handle')) return;
    
    e.stopPropagation();
    onSelect(e as any);
    
    if (isMobile) {
      setShowMobileControls(true);
      return;
    }
    
    const touch = getTouchPosition(e);
    setIsDragging(true);
    dragStartPos.current = {
      x: touch.x - position.x,
      y: touch.y - position.y,
    };
  };

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartSize.current = { ...size };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  // 回転開始
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
      rotateStartAngle.current = angle - rotation;
    }
  };

  // マウス移動とタッチ移動
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;
        const aspectRatio = resizeStartSize.current.width / resizeStartSize.current.height;
        
        let newWidth = Math.max(50, resizeStartSize.current.width + deltaX);
        let newHeight = newWidth / aspectRatio;
        
        setSize({ width: newWidth, height: newHeight });
      } else if (isRotating && elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        setRotation(angle - rotateStartAngle.current);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        const touch = getTouchPosition(e);
        const newX = touch.x - dragStartPos.current.x;
        const newY = touch.y - dragStartPos.current.y;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing || isRotating) {
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
      setIsRotating(false);
    };

    if (isDragging || isResizing || isRotating) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchend", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isRotating, position, size, rotation, onUpdate]);

  const handleQuickRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    onUpdate({
      position_x: position.x,
      position_y: position.y,
      width: size.width,
      height: size.height,
      rotation: newRotation,
    });
  };

  const handleMobileRotate = (angle: number) => {
    setRotation(angle);
    onUpdate({
      position_x: position.x,
      position_y: position.y,
      width: size.width,
      height: size.height,
      rotation: angle,
    });
  };

  const handleMobileResize = (scale: number) => {
    const newWidth = initialWidth * scale;
    const newHeight = initialHeight * scale;
    setSize({ width: newWidth, height: newHeight });
    onUpdate({
      position_x: position.x,
      position_y: position.y,
      width: newWidth,
      height: newHeight,
      rotation,
    });
  };

  return (
    <>
      <div
        ref={elementRef}
        className={`absolute ${isMobile ? 'cursor-pointer' : 'cursor-move'} transition-shadow select-none ${
          isSelected ? "ring-2 ring-primary shadow-xl" : ""
        } ${isDragging ? "opacity-80" : ""}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: `rotate(${rotation}deg)`,
          zIndex,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* アイテムコンテンツ */}
        <div className="w-full h-full relative">
          {image ? (
            <img
              src={image}
              alt="Binder item"
              className="w-full h-full object-cover rounded shadow-lg border-2 border-white pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-white rounded shadow-lg border-2 border-gray-200 flex items-center justify-center">
              {content}
            </div>
          )}
        </div>

        {/* コントロールボタン（選択時のみ表示 - デスクトップのみ） */}
        {isSelected && !isMobile && (
          <>
            <div className="absolute -top-14 left-0 flex gap-1 bg-white rounded-lg shadow-lg p-1 control-button">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleQuickRotate}
                title="90度回転"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              {onDuplicate && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={onDuplicate}
                  title="複製"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
              {onBringForward && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={onBringForward}
                  title="前面へ"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              )}
              {onSendBackward && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={onSendBackward}
                  title="背面へ"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={onDelete}
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* リサイズハンドル（4隅） */}
            <div
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize resize-handle hover:scale-125 transition-transform"
              onMouseDown={(e) => handleResizeStart(e, "se")}
              title="サイズ変更"
            />
            
            {/* 回転ハンドル */}
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-500 rounded-full cursor-grab rotate-handle hover:scale-125 transition-transform flex items-center justify-center"
              onMouseDown={handleRotateStart}
              title="回転"
            >
              <RotateCw className="w-3 h-3 text-white" />
            </div>
          </>
        )}
      </div>

      {/* モバイルコントロールパネル */}
      {isMobile && isSelected && (
        <MobileItemControls
          isOpen={showMobileControls}
          onClose={() => setShowMobileControls(false)}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
          onRotate={handleMobileRotate}
          onResize={handleMobileResize}
          currentRotation={rotation}
          currentScale={size.width / initialWidth}
        />
      )}
    </>
  );
}
