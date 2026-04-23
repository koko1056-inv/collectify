import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserItem } from "./goods-display/types";
import { ItemSelector } from "./goods-display/ItemSelector";
import { BackgroundSelector } from "./goods-display/BackgroundSelector";
import { GalleryListView } from "./goods-display/GalleryListView";
import { GeneratedResultView } from "./goods-display/GeneratedResultView";
import { UploadPresetDialog } from "./goods-display/UploadPresetDialog";
import {
  useSaveDisplayGallery,
  shareDisplayToTwitter,
} from "./goods-display/useGoodsDisplayActions";

interface GoodsDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  initialShowGallery?: boolean;
}

export function GoodsDisplayModal({
  isOpen,
  onClose,
  userId,
  initialShowGallery = false,
}: GoodsDisplayModalProps) {
  const [selectedItems, setSelectedItems] = useState<UserItem[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [showGallery, setShowGallery] = useState(initialShowGallery);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadInitialCategory, setUploadInitialCategory] = useState("shelf");

  const saveGalleryMutation = useSaveDisplayGallery();

  useEffect(() => {
    if (isOpen) setShowGallery(initialShowGallery);
  }, [isOpen, initialShowGallery]);

  const handleItemToggle = (item: UserItem) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((i) => i.id === item.id);
      if (isSelected) return prev.filter((i) => i.id !== item.id);
      if (prev.length >= 5) {
        toast.error("最大5個まで選択できます");
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleGenerate = async () => {
    if (selectedItems.length === 0) {
      toast.error("グッズを選択してください");
      return;
    }
    if (!backgroundImage) {
      toast.error("背景画像をアップロードしてください");
      return;
    }

    setIsGenerating(true);
    try {
      const itemImages = selectedItems.map((item) => item.image);
      const defaultPrompt = `この背景画像に、選択されたグッズ（${selectedItems
        .map((i) => i.title)
        .join(
          "、"
        )}）を自然に配置して、魅力的な展示場の画像を生成してください。グッズは重ならないように配置し、全体的にバランスの取れた構図にしてください。`;
      const prompt = customPrompt.trim() || defaultPrompt;

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: { imageUrl: backgroundImage, prompt, itemImages },
      });
      if (error) throw error;

      if (data?.editedImageUrl) {
        setGeneratedImage(data.editedImageUrl);
        toast.success("グッズ展示場の画像を生成しました！");
      } else {
        throw new Error("画像の生成に失敗しました");
      }
    } catch (error) {
      console.error("Error generating display:", error);
      toast.error(
        error instanceof Error ? error.message : "画像の生成に失敗しました"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedItems([]);
    setBackgroundImage(null);
    setGeneratedImage(null);
    setSelectedPreset(null);
    setGalleryTitle("");
    setGalleryDescription("");
  };

  const handleSaveGallery = async () => {
    if (!generatedImage || !userId) {
      toast.error("保存する画像がありません");
      return;
    }
    if (!galleryTitle.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    await saveGalleryMutation.mutateAsync({
      userId,
      imageUrl: generatedImage,
      itemIds: selectedItems.map((i) => i.id),
      backgroundPresetId: selectedPreset,
      title: galleryTitle,
      description: galleryDescription,
    });
    setGalleryTitle("");
    setGalleryDescription("");
  };

  const handleOpenUploadDialog = (category: string) => {
    setUploadInitialCategory(category);
    setShowUploadDialog(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              グッズ展示場
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden px-6 pb-6">
            {generatedImage ? (
              <GeneratedResultView
                generatedImage={generatedImage}
                galleryTitle={galleryTitle}
                galleryDescription={galleryDescription}
                onTitleChange={setGalleryTitle}
                onDescriptionChange={setGalleryDescription}
                onSave={handleSaveGallery}
                onReset={handleReset}
                onShareTwitter={() =>
                  userId &&
                  shareDisplayToTwitter(userId, generatedImage, galleryTitle)
                }
                isSaving={saveGalleryMutation.isPending}
              />
            ) : (
              <Tabs
                defaultValue={showGallery ? "gallery" : "create"}
                className="h-full flex flex-col"
              >
                <TabsList className="grid w-full max-w-[280px] mx-auto grid-cols-2 bg-white border border-gray-200 rounded-full mb-4">
                  <TabsTrigger
                    value="create"
                    className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
                    onClick={() => setShowGallery(false)}
                  >
                    作成
                  </TabsTrigger>
                  <TabsTrigger
                    value="gallery"
                    className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
                    onClick={() => setShowGallery(true)}
                  >
                    ギャラリー
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="gallery"
                  className="flex-1 overflow-y-auto"
                  style={{ WebkitOverflowScrolling: "touch" as any }}
                >
                  <GalleryListView userId={userId} enabled={isOpen && showGallery} />
                </TabsContent>

                <TabsContent
                  value="create"
                  className="flex-1 overflow-y-auto"
                  style={{ WebkitOverflowScrolling: "touch" as any }}
                >
                  <div className="space-y-6 pb-4 pr-2">
                    <BackgroundSelector
                      backgroundImage={backgroundImage}
                      onBackgroundImageChange={setBackgroundImage}
                      selectedPreset={selectedPreset}
                      onSelectedPresetChange={setSelectedPreset}
                      customPrompt={customPrompt}
                      onCustomPromptChange={setCustomPrompt}
                      onResetSelectedItems={() => setSelectedItems([])}
                      onOpenUploadDialog={handleOpenUploadDialog}
                      isOpen={isOpen}
                    />

                    <ItemSelector
                      userId={userId}
                      selectedItems={selectedItems}
                      onItemToggle={handleItemToggle}
                      isOpen={isOpen}
                    />

                    <Button
                      onClick={handleGenerate}
                      disabled={
                        isGenerating ||
                        selectedItems.length === 0 ||
                        !backgroundImage
                      }
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          グッズ展示場を生成
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <UploadPresetDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        userId={userId}
        initialCategory={uploadInitialCategory}
      />
    </>
  );
}
