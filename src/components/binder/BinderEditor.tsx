import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { useBinder } from "@/hooks/useBinder";
import { BinderCanvas } from "./BinderCanvas";
import { BinderToolbar } from "./BinderToolbar";
import { BinderItemPalette } from "./BinderItemPalette";
import { DecorationTool } from "@/types/binder";

interface BinderEditorProps {
  pageId: string;
  onClose: () => void;
}

export function BinderEditor({ pageId, onClose }: BinderEditorProps) {
  const { binderPages } = useBinder();
  const page = binderPages.find((p) => p.id === pageId);
  const [activeTool, setActiveTool] = useState<DecorationTool>("select");
  const [showItemPalette, setShowItemPalette] = useState(false);

  if (!page) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-semibold">{page.title}</h2>
        </div>
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          保存
        </Button>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex overflow-hidden">
        {/* ツールバー */}
        <div className="w-20 bg-white border-r">
          <BinderToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onShowItemPalette={() => setShowItemPalette(!showItemPalette)}
          />
        </div>

        {/* キャンバス */}
        <div className="flex-1 overflow-auto p-8">
          <BinderCanvas pageId={pageId} activeTool={activeTool} />
        </div>

        {/* アイテムパレット */}
        {showItemPalette && (
          <div className="w-80 bg-white border-l overflow-y-auto">
            <BinderItemPalette pageId={pageId} onClose={() => setShowItemPalette(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
