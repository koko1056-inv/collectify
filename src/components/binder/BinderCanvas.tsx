import { useEffect, useRef } from "react";
import { useBinder } from "@/hooks/useBinder";
import { DecorationTool } from "@/types/binder";

interface BinderCanvasProps {
  pageId: string;
  activeTool: DecorationTool;
}

export function BinderCanvas({ pageId, activeTool }: BinderCanvasProps) {
  const { binderPages, getBinderItems, getBinderDecorations } = useBinder();
  const page = binderPages.find((p) => p.id === pageId);
  const itemsQuery = getBinderItems(pageId);
  const decorationsQuery = getBinderDecorations(pageId);
  const items = itemsQuery.data || [];
  const decorations = decorationsQuery.data || [];
  const canvasRef = useRef<HTMLDivElement>(null);

  if (!page) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-full">
      {/* バインダー風のキャンバス */}
      <div className="relative bg-white shadow-2xl rounded-lg overflow-hidden"
        style={{
          width: "800px",
          height: "1100px",
          backgroundColor: page.background_color || "#ffffff",
          backgroundImage: page.background_image ? `url(${page.background_image})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        ref={canvasRef}
      >
        {/* バインダーの穴（左側） */}
        <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-12">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-gray-300 border-4 border-gray-400 shadow-inner"
            />
          ))}
        </div>

        {/* グリッド（ガイド用） */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            marginLeft: "60px",
          }}
        />

        {/* アイテムレンダリングエリア */}
        <div className="absolute inset-0 pl-16">
          {items.map((item) => (
            <div
              key={item.id}
              className="absolute cursor-move hover:ring-2 hover:ring-primary transition-all"
              style={{
                left: `${item.position_x}px`,
                top: `${item.position_y}px`,
                width: `${item.width}px`,
                height: `${item.height}px`,
                transform: `rotate(${item.rotation}deg)`,
                zIndex: item.z_index,
              }}
            >
              {/* アイテムの画像をここにレンダリング */}
              <div className="w-full h-full bg-gray-200 border-2 border-gray-300 rounded shadow-md flex items-center justify-center">
                <span className="text-xs text-gray-500">Item</span>
              </div>
            </div>
          ))}

          {decorations.map((decoration) => (
            <div
              key={decoration.id}
              className="absolute cursor-move"
              style={{
                left: `${decoration.position_x}px`,
                top: `${decoration.position_y}px`,
                width: decoration.width ? `${decoration.width}px` : "auto",
                height: decoration.height ? `${decoration.height}px` : "auto",
                transform: `rotate(${decoration.rotation}deg)`,
                zIndex: decoration.z_index,
              }}
            >
              {/* デコレーションのレンダリング */}
              {decoration.decoration_type === "text" && (
                <div
                  className="text-lg font-semibold"
                  style={decoration.style_config as any}
                >
                  {decoration.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 選択中のツールに応じたカーソル表示 */}
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-medium">
          {activeTool === "select" && "選択"}
          {activeTool === "item" && "アイテム配置"}
          {activeTool === "sticker" && "ステッカー"}
          {activeTool === "frame" && "フレーム"}
          {activeTool === "text" && "テキスト"}
          {activeTool === "background" && "背景"}
        </div>
      </div>
    </div>
  );
}
