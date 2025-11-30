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
  const [resizeDirection, setResizeDirection] = useState('');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const rotateStartAngle = useRef(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // モバイルタッチイベントのサポート
  const getTouchPosition = (e: TouchEvent | React.TouchEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e;
    return { x: touch.clientX, y: touch.clientY };
  };

  // ドラッグ開始（マウス）
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.control-button, .resize-handle, .rotate-handle')) return;
    
    e.stopPropagation();
    e.preventDefault();
    onSelect(e);
    
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
    
    const touch = getTouchPosition(e);
    
    // 即座にドラッグ開始
    setIsDragging(true);
    dragStartPos.current = {
      x: touch.x - position.x,
      y: touch.y - position.y,
    };
    
    // モバイルの場合は長押しでコントロールパネル表示
    if (isMobile) {
      const timer = setTimeout(() => {
        setShowMobileControls(true);
        setIsDragging(false);
      }, 500);
      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartSize.current = { ...size };
    resizeStartPos.current = { ...position };
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
      e.preventDefault();
      
      if (isDragging) {
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;
        const aspectRatio = resizeStartSize.current.width / resizeStartSize.current.height;
        
        let newWidth = resizeStartSize.current.width;
        let newHeight = resizeStartSize.current.height;
        let newX = resizeStartPos.current.x;
        let newY = resizeStartPos.current.y;
        
        // 8方向リサイズ
        if (resizeDirection.includes('e')) {
          newWidth = Math.max(50, resizeStartSize.current.width + deltaX);
        } else if (resizeDirection.includes('w')) {
          newWidth = Math.max(50, resizeStartSize.current.width - deltaX);
          newX = resizeStartPos.current.x + (resizeStartSize.current.width - newWidth);
        }
        
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(50, resizeStartSize.current.height + deltaY);
        } else if (resizeDirection.includes('n')) {
          newHeight = Math.max(50, resizeStartSize.current.height - deltaY);
          newY = resizeStartPos.current.y + (resizeStartSize.current.height - newHeight);
        }
        
        // コーナーハンドルの場合はアスペクト比を維持
        if (resizeDirection.length === 2) {
          if (resizeDirection === 'se' || resizeDirection === 'nw') {
            newHeight = newWidth / aspectRatio;
            if (resizeDirection === 'nw') {
              newY = resizeStartPos.current.y + (resizeStartSize.current.height - newHeight);
            }
          } else if (resizeDirection === 'ne' || resizeDirection === 'sw') {
            newHeight = newWidth / aspectRatio;
            if (resizeDirection === 'ne') {
              newY = resizeStartPos.current.y + (resizeStartSize.current.height - newHeight);
            }
          }
        }
        
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
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
        e.preventDefault();
        const touch = getTouchPosition(e);
        const newX = touch.x - dragStartPos.current.x;
        const newY = touch.y - dragStartPos.current.y;
        setPosition({ x: newX, y: newY });
        
        // 長押しタイマーをキャンセル（ドラッグ中）
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
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
      
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    if (isDragging || isResizing || isRotating) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchend", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isRotating, position, size, rotation, onUpdate, longPressTimer, resizeDirection]);

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
        className={`absolute transition-shadow select-none ${
          isSelected ? "ring-2 ring-primary shadow-xl" : ""
        } ${isDragging ? "opacity-80 cursor-grabbing" : "cursor-grab"}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: `rotate(${rotation}deg)`,
          zIndex,
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
              className="absolute -top-2 -left-2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-nwse-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "nw")}
              title="サイズ変更"
            />
            <div
              className="absolute -top-2 -right-2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-nesw-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "ne")}
              title="サイズ変更"
            />
            <div
              className="absolute -bottom-2 -left-2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-nesw-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "sw")}
              title="サイズ変更"
            />
            <div
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-nwse-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "se")}
              title="サイズ変更"
            />
            
            {/* リサイズハンドル（4辺） */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-ns-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "n")}
              title="サイズ変更"
            />
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-ns-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "s")}
              title="サイズ変更"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -left-2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-ew-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "w")}
              title="サイズ変更"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -right-2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-ew-resize resize-handle hover:scale-125 transition-transform shadow-lg"
              onMouseDown={(e) => handleResizeStart(e, "e")}
              title="サイズ変更"
            />
            
            {/* 回転ハンドル */}
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 bg-accent border-2 border-background rounded-full cursor-grab active:cursor-grabbing rotate-handle hover:scale-110 transition-transform shadow-lg flex items-center justify-center"
              onMouseDown={handleRotateStart}
              title="回転"
            >
              <RotateCw className="w-4 h-4 text-accent-foreground" />
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