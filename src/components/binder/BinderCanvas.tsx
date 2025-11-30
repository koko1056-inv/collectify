import { useState } from "react";
import { useBinder } from "@/hooks/useBinder";
import { DecorationTool, BinderItem, BinderDecoration, FramePreset } from "@/types/binder";
import { ResizableRotatableItem } from "./ResizableRotatableItem";
import { CardPocketBinder } from "./CardPocketBinder";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDroppable } from "@dnd-kit/core";

interface BinderCanvasProps {
  pageId: string;
  activeTool: DecorationTool;
  selectedFrame: FramePreset | null;
}

export function BinderCanvas({ pageId, activeTool, selectedFrame }: BinderCanvasProps) {
  const { binderPages, getBinderItems, getBinderDecorations, updateItem, deleteItem, updateDecoration, deleteDecoration, addItem } = useBinder();
  const page = (binderPages as any[]).find((p) => p.id === pageId);
  const itemsQuery = getBinderItems(pageId);
  const decorationsQuery = getBinderDecorations(pageId);
  const items = itemsQuery.data || [];
  const decorations = decorationsQuery.data || [];
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { isOver, setNodeRef } = useDroppable({
    id: "binder-canvas",
    data: { type: "canvas" },
  });

  // アイテムの実際のデータを取得
  const { data: itemsWithData = [] } = useQuery({
    queryKey: ["binder-items-with-data", pageId, items.map((i: BinderItem) => i.user_item_id || i.official_item_id)],
    enabled: items.length > 0,
    queryFn: async () => {
      const result = [];
      
      for (const item of items) {
        let itemData = null;
        
        if (item.user_item_id) {
          const { data } = await supabase
            .from("user_items")
            .select("id, title, image")
            .eq("id", item.user_item_id)
            .single();
          itemData = data;
        } else if (item.official_item_id) {
          const { data } = await supabase
            .from("official_items")
            .select("id, title, image")
            .eq("id", item.official_item_id)
            .single();
          itemData = data;
        } else if (item.custom_image_url) {
          itemData = {
            id: item.id,
            title: "カスタム画像",
            image: item.custom_image_url,
          };
        }
        
        if (itemData) {
          result.push({
            ...item,
            item_data: itemData,
          });
        }
      }
      
      return result;
    },
  });


  if (!page) {
    return null;
  }

  // カードポケット型の場合は専用コンポーネントを使用
  if (page.binder_type === "card_pocket") {
    return <CardPocketBinder page={page} />;
  }

  // フリーレイアウト型
  return (
    <div className="flex items-center justify-center min-h-full">
        <div
          ref={setNodeRef}
          className={`relative bg-white shadow-2xl rounded-lg overflow-hidden transition-all ${
            isOver ? "ring-4 ring-primary" : ""
          }`}
          style={{
            width: "800px",
            height: "1100px",
            backgroundColor: page.background_color || "#ffffff",
            backgroundImage: page.background_image ? `url(${page.background_image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onClick={() => setSelectedItemId(null)}
        >
          {/* バインダーの穴（左側） */}
          <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-12 z-10 pointer-events-none">
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
                linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
              marginLeft: "60px",
            }}
          />

          {/* アイテムレンダリングエリア */}
          <div className="absolute inset-0 pl-16">
            {itemsWithData.map((item: any) => {
              const frameStyle = selectedFrame && selectedItemId === item.id ? {
                border: selectedFrame.border_style,
                borderRadius: `${selectedFrame.corner_radius}px`,
                boxShadow: selectedFrame.shadow_style || "none",
              } : {};

              return (
                <ResizableRotatableItem
                  key={item.id}
                  id={item.id}
                  image={item.item_data?.image}
                  initialX={item.position_x}
                  initialY={item.position_y}
                  initialWidth={item.width}
                  initialHeight={item.height}
                  initialRotation={item.rotation}
                  zIndex={item.z_index}
                  isSelected={selectedItemId === item.id}
                  onSelect={() => setSelectedItemId(item.id)}
                  onUpdate={(updates) =>
                    updateItem.mutate({ id: item.id, updates })
                  }
                  onDelete={() => deleteItem.mutate({ id: item.id, pageId })}
                  onDuplicate={async () => {
                    await addItem.mutateAsync({
                      binder_page_id: pageId,
                      user_item_id: item.user_item_id,
                      official_item_id: item.official_item_id,
                      custom_image_url: item.custom_image_url,
                      position_x: item.position_x + 20,
                      position_y: item.position_y + 20,
                      width: item.width,
                      height: item.height,
                      rotation: item.rotation,
                      z_index: items.length + 1,
                    });
                  }}
                  onBringForward={() => {
                    updateItem.mutate({ id: item.id, updates: { z_index: item.z_index + 1 } });
                  }}
                  onSendBackward={() => {
                    updateItem.mutate({ id: item.id, updates: { z_index: Math.max(1, item.z_index - 1) } });
                  }}
                />
              );
            })}

            {decorations.map((decoration: BinderDecoration) => (
              <ResizableRotatableItem
                key={decoration.id}
                id={decoration.id}
                content={
                  decoration.decoration_type === "text" ? (
                    <div
                      style={{
                        fontSize: decoration.style_config?.fontSize || "24px",
                        color: decoration.style_config?.color || "#000",
                        fontWeight: decoration.style_config?.fontWeight || "normal",
                        fontStyle: decoration.style_config?.fontStyle || "normal",
                        textAlign: decoration.style_config?.textAlign || "center",
                        textShadow: decoration.style_config?.textShadow || "none",
                        WebkitTextStroke: decoration.style_config?.textStroke || "none",
                        whiteSpace: "pre-wrap",
                        padding: "8px",
                      }}
                    >
                      {decoration.content}
                    </div>
                  ) : decoration.decoration_type === "sticker" && decoration.content ? (
                    decoration.content.startsWith("http") ? (
                      <img
                        src={decoration.content}
                        alt="sticker"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ color: decoration.style_config?.color || "#FF6B9D" }}
                        dangerouslySetInnerHTML={{ __html: decoration.content }}
                      />
                    )
                  ) : null
                }
                initialX={decoration.position_x}
                initialY={decoration.position_y}
                initialWidth={decoration.width || 60}
                initialHeight={decoration.height || 60}
                initialRotation={decoration.rotation}
                zIndex={decoration.z_index}
                isSelected={selectedItemId === decoration.id}
                onSelect={() => setSelectedItemId(decoration.id)}
                onUpdate={(updates) =>
                  updateDecoration.mutate({ id: decoration.id, updates })
                }
                onDelete={() => deleteDecoration.mutate({ id: decoration.id, pageId })}
              />
            ))}
          </div>

          {/* ツール表示 */}
          <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-medium pointer-events-none">
            {activeTool === "select" && "選択"}
            {activeTool === "item" && "アイテム配置"}
            {activeTool === "sticker" && "ステッカー"}
            {activeTool === "frame" && "フレーム"}
            {activeTool === "text" && "テキスト"}
            {activeTool === "background" && "背景"}
          </div>

          {/* ドロップヒント */}
          {isOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none">
              <div className="bg-white rounded-lg shadow-xl p-6 text-center">
                <p className="text-lg font-semibold text-primary">ここにドロップ</p>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
