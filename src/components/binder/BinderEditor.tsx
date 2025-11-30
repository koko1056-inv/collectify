import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { useBinder } from "@/hooks/useBinder";
import { useAutoSave } from "@/hooks/useAutoSave";
import { BinderCanvas } from "./BinderCanvas";
import { BinderToolbar } from "./BinderToolbar";
import { BinderItemPalette } from "./BinderItemPalette";
import { StickerPalette } from "./StickerPalette";
import { FramePalette } from "./FramePalette";
import { TextTool } from "./TextTool";
import { BackgroundTool } from "./BackgroundTool";
import { DecorationTool, FramePreset } from "@/types/binder";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BinderEditorProps {
  pageId: string;
  onClose: () => void;
}

export function BinderEditor({ pageId, onClose }: BinderEditorProps) {
  const { binderPages, updatePage } = useBinder();
  const page = (binderPages as any[]).find((p) => p.id === pageId);
  const [activeTool, setActiveTool] = useState<DecorationTool>("select");
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FramePreset | null>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // 自動保存（ページの変更を監視）
  useAutoSave({
    data: page,
    onSave: async (data) => {
      if (data) {
        setIsSaving(true);
        await updatePage.mutateAsync({
          id: data.id,
          updates: {
            title: data.title,
            background_color: data.background_color,
            background_image: data.background_image,
          },
        });
        setLastSaved(new Date());
        setIsSaving(false);
      }
    },
    delay: 3000,
    enabled: true,
  });

  if (!page) {
    return null;
  }

  const handleToolChange = (tool: DecorationTool) => {
    setActiveTool(tool);
    setShowSidebar(tool !== "select");
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-semibold">{page.title}</h2>
          <span className="text-sm text-muted-foreground">
            {page.binder_type === "free_layout" ? "フリーレイアウト" : "カードポケット型"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isSaving ? (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              保存中...
            </span>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              自動保存済み
            </span>
          )}
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex overflow-hidden">
        {/* ツールバー */}
        <div className="w-20 bg-white border-r">
          <BinderToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />
        </div>

        {/* キャンバス */}
        <div className="flex-1 overflow-auto p-8">
          <BinderCanvas
            pageId={pageId}
            activeTool={activeTool}
            selectedFrame={selectedFrame}
          />
        </div>

        {/* サイドバー */}
        {showSidebar && (
          <div className="w-80 bg-white border-l">
            <ScrollArea className="h-full">
              {activeTool === "item" && (
                <BinderItemPalette pageId={pageId} onClose={() => setShowSidebar(false)} />
              )}
              {activeTool === "sticker" && <StickerPalette pageId={pageId} />}
              {activeTool === "frame" && (
                <FramePalette pageId={pageId} onSelectFrame={setSelectedFrame} />
              )}
              {activeTool === "text" && <TextTool pageId={pageId} />}
              {activeTool === "background" && <BackgroundTool pageId={pageId} />}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
