import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Menu, ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

interface BinderEditorProps {
  pageId: string;
  onClose: () => void;
  isPreviewMode?: boolean;
}

export function BinderEditor({ pageId, onClose, isPreviewMode = false }: BinderEditorProps) {
  const { binderPages, updatePage, addItem, createPage } = useBinder();
  const [currentPageId, setCurrentPageId] = useState(pageId);
  const page = (binderPages as any[]).find((p) => p.id === currentPageId);
  const currentIndex = binderPages.findIndex((p) => p.id === currentPageId);
  const hasPrevPage = currentIndex > 0;
  const hasNextPage = currentIndex < binderPages.length - 1;
  const [activeTool, setActiveTool] = useState<DecorationTool>("select");
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FramePreset | null>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();
  const [showMobileToolbar, setShowMobileToolbar] = useState(false);

  // ドラッグ&ドロップハンドラー
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // コレクションアイテムをキャンバスまたはポケットにドロップ
    if (active.data.current?.type === "collection-item") {
      const { itemType, item } = active.data.current;
      
      // キャンバスへのドロップ
      if (over.id === "binder-canvas") {
        addItem.mutate({
          binder_page_id: currentPageId,
          user_item_id: itemType === "user" ? item.id : null,
          official_item_id: itemType === "official" ? item.id : null,
          custom_image_url: null,
          position_x: isMobile ? 150 : 300,
          position_y: isMobile ? 150 : 300,
          width: isMobile ? 100 : 150,
          height: isMobile ? 133 : 200,
          rotation: 0,
          z_index: Date.now(),
        });
      }
      // カードポケットへのドロップ
      else if (over.id.toString().startsWith("slot-")) {
        const slotIndex = parseInt(over.id.toString().replace("slot-", ""));
        addItem.mutate({
          binder_page_id: currentPageId,
          user_item_id: itemType === "user" ? item.id : null,
          official_item_id: itemType === "official" ? item.id : null,
          custom_image_url: null,
          position_x: 0,
          position_y: 0,
          width: 100,
          height: 140,
          rotation: 0,
          z_index: slotIndex,
        });
      }
    }
  };

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
    if (isPreviewMode) return; // プレビューモードではツール変更を無効化
    setActiveTool(tool);
    setShowSidebar(tool !== "select");
    if (isMobile) {
      setShowMobileToolbar(false);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPageId(binderPages[currentIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPageId(binderPages[currentIndex + 1].id);
    }
  };

  const handleAddPage = async () => {
    try {
      const newPage = await createPage.mutateAsync({
        title: `新しいページ ${binderPages.length + 1}`,
        binderType: page?.binder_type || "free_layout",
        layoutConfig: page?.layout_config,
      });
      if (newPage) {
        setCurrentPageId(newPage.id);
        toast.success("新しいページを追加しました");
      }
    } catch (error) {
      toast.error("ページの追加に失敗しました");
    }
  };

  return (
    <DndContext onDragEnd={isPreviewMode ? () => {} : handleDragEnd}>
      <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b p-3 md:p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-xl font-semibold truncate">
                {page.title}
                {isPreviewMode && <span className="ml-2 text-sm text-muted-foreground">(プレビュー)</span>}
              </h2>
              <span className="text-xs md:text-sm text-muted-foreground">
                {page.binder_type === "free_layout" ? "フリーレイアウト" : "カードポケット型"}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 md:gap-3">
            {/* ページナビゲーション */}
            {!isPreviewMode && (
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9"
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs md:text-sm font-medium px-2 whitespace-nowrap">
                {currentIndex + 1} / {binderPages.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9"
                onClick={handleNextPage}
                disabled={!hasNextPage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9"
                onClick={handleAddPage}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            )}
            
            {/* 自動保存ステータス - デスクトップのみ */}
            {!isPreviewMode && (
            <div className="hidden sm:flex items-center gap-3">
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
            )}
          </div>
        </div>

        {/* メインエリア */}
        <div className="flex-1 flex overflow-hidden">
          {/* ツールバー - Desktop only */}
          {!isMobile && !isPreviewMode && (
            <div className="w-16 md:w-20 bg-white border-r">
              <BinderToolbar
                activeTool={activeTool}
                onToolChange={handleToolChange}
              />
            </div>
          )}

          {/* キャンバス */}
          <div className="flex-1 overflow-auto p-2 md:p-8 pb-20 md:pb-8">
            <BinderCanvas
              pageId={currentPageId}
              activeTool={activeTool}
              selectedFrame={selectedFrame}
            />
          </div>

          {/* サイドバー - Desktop */}
          {!isMobile && !isPreviewMode && showSidebar && (
            <div className="w-80 bg-white border-l">
              <ScrollArea className="h-full">
                {activeTool === "item" && (
                  <BinderItemPalette pageId={currentPageId} onClose={() => setShowSidebar(false)} />
                )}
                {activeTool === "sticker" && <StickerPalette pageId={currentPageId} />}
                {activeTool === "frame" && (
                  <FramePalette pageId={currentPageId} onSelectFrame={setSelectedFrame} />
                )}
                {activeTool === "text" && <TextTool pageId={currentPageId} />}
                {activeTool === "background" && <BackgroundTool pageId={currentPageId} />}
              </ScrollArea>
            </div>
          )}

          {/* Mobile Sidebar Sheet */}
          {isMobile && !isPreviewMode && showSidebar && (
            <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
              <SheetContent side="bottom" className="h-[80vh] p-0">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">
                    {activeTool === "item" && "コレクション"}
                    {activeTool === "sticker" && "ステッカー"}
                    {activeTool === "frame" && "フレーム"}
                    {activeTool === "text" && "テキスト"}
                    {activeTool === "background" && "背景"}
                  </h3>
                </div>
                <ScrollArea className="h-[calc(80vh-80px)]">
                  {activeTool === "item" && (
                    <BinderItemPalette pageId={currentPageId} onClose={() => setShowSidebar(false)} />
                  )}
                  {activeTool === "sticker" && <StickerPalette pageId={currentPageId} />}
                  {activeTool === "frame" && (
                    <FramePalette pageId={currentPageId} onSelectFrame={setSelectedFrame} />
                  )}
                  {activeTool === "text" && <TextTool pageId={currentPageId} />}
                  {activeTool === "background" && <BackgroundTool pageId={currentPageId} />}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* モバイルツールバー（下部固定） */}
        {isMobile && !isPreviewMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
            <div className="flex justify-around items-center p-2">
              <BinderToolbar
                activeTool={activeTool}
                onToolChange={handleToolChange}
              />
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
