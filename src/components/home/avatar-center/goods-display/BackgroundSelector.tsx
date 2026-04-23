import { Upload, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { BackgroundPreset, DEFAULT_PRESETS } from "./types";

interface Props {
  backgroundImage: string | null;
  onBackgroundImageChange: (url: string | null) => void;
  selectedPreset: string | null;
  onSelectedPresetChange: (id: string | null) => void;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  onResetSelectedItems: () => void;
  onOpenUploadDialog: (category: string) => void;
  isOpen: boolean;
}

export function BackgroundSelector({
  backgroundImage,
  onBackgroundImageChange,
  selectedPreset,
  onSelectedPresetChange,
  customPrompt,
  onCustomPromptChange,
  onResetSelectedItems,
  onOpenUploadDialog,
  isOpen,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);

  const { data: userPresets = [] } = useQuery({
    queryKey: ["background-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("background_presets")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BackgroundPreset[];
    },
    enabled: isOpen,
  });

  const presetsByCategory = {
    shelf: [
      ...DEFAULT_PRESETS.filter((p) => p.category === "shelf"),
      ...userPresets.filter((p) => p.category === "shelf"),
    ],
    room: [
      ...DEFAULT_PRESETS.filter((p) => p.category === "room"),
      ...userPresets.filter((p) => p.category === "room"),
    ],
    showcase: [
      ...DEFAULT_PRESETS.filter((p) => p.category === "showcase"),
      ...userPresets.filter((p) => p.category === "showcase"),
    ],
    display: [
      ...DEFAULT_PRESETS.filter((p) => p.category === "display"),
      ...userPresets.filter((p) => p.category === "display"),
    ],
  };

  const handlePresetSelect = async (preset: BackgroundPreset, userId?: string) => {
    onResetSelectedItems();
    onCustomPromptChange("");

    if (preset.image_url) {
      onBackgroundImageChange(preset.image_url);
      onSelectedPresetChange(preset.id);
      setSelectedCategory(null);
      return;
    }

    setIsGeneratingBackground(true);
    onSelectedPresetChange(preset.id);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-background",
        { body: { prompt: preset.prompt } }
      );
      if (error) throw error;

      if (data?.imageUrl) {
        onBackgroundImageChange(data.imageUrl);

        if (userId) {
          const timestamp = new Date()
            .toLocaleString("ja-JP", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
            .replace(/\//g, "-")
            .replace(/:/g, "");

          const { error: saveError } = await supabase
            .from("background_presets")
            .insert({
              user_id: userId,
              name: `AI生成 - ${preset.name} (${timestamp})`,
              image_url: data.imageUrl,
              category: preset.category,
              is_public: true,
            });

          if (!saveError) {
            queryClient.invalidateQueries({ queryKey: ["background-presets"] });
            toast.success("背景プリセットとして保存しました");
          }
        }
        toast.success("背景画像を生成しました");
        setSelectedCategory(null);
      } else {
        throw new Error("背景画像の生成に失敗しました");
      }
    } catch (error) {
      console.error("Error generating background:", error);
      toast.error(
        error instanceof Error ? error.message : "背景画像の生成に失敗しました"
      );
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    onSelectedPresetChange(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      onBackgroundImageChange(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">背景画像</label>
        {backgroundImage ? (
          <div className="relative border rounded-lg overflow-hidden">
            <img
              src={backgroundImage}
              alt="Background"
              className="w-full h-48 object-cover"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => {
                onBackgroundImageChange(null);
                onSelectedPresetChange(null);
              }}
            >
              削除
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="preset" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preset">プリセット</TabsTrigger>
              <TabsTrigger value="upload">カスタム</TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="space-y-3">
              {selectedCategory ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                    >
                      ← カテゴリ一覧に戻る
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onOpenUploadDialog(selectedCategory)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      背景を追加
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {presetsByCategory[
                      selectedCategory as keyof typeof presetsByCategory
                    ]?.map((preset) => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        className="h-auto p-2 relative"
                        onClick={() => handlePresetSelect(preset)}
                        disabled={isGeneratingBackground}
                      >
                        {preset.image_url ? (
                          <img
                            src={preset.image_url}
                            alt={preset.name}
                            className="w-full h-32 object-cover rounded"
                          />
                        ) : preset.icon ? (
                          <preset.icon className="w-12 h-12" />
                        ) : null}
                      </Button>
                    ))}
                  </div>

                  {isGeneratingBackground && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      背景画像を生成中...
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    カテゴリを選択して背景画像を管理
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        className="h-auto flex-col gap-1.5 p-3"
                        onClick={() => setSelectedCategory(preset.category)}
                      >
                        {preset.icon && <preset.icon className="w-6 h-6" />}
                        <span className="text-xs font-medium">{preset.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {presetsByCategory[
                            preset.category as keyof typeof presetsByCategory
                          ]?.length || 0}
                          件
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload">
              <div className="border-2 border-dashed rounded-lg p-8">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    クリックして背景画像をアップロード
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBackgroundUpload}
                  />
                </label>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {backgroundImage && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            生成プロンプト（オプション）
          </label>
          <Textarea
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="生成する画像の説明を入力してください。空白の場合はデフォルトプロンプトが使用されます。"
            className="min-h-[80px]"
          />
        </div>
      )}
    </>
  );
}
