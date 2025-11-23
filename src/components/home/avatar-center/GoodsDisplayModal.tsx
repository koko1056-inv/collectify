import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Sparkles, Home, Box, Store as StoreIcon, Frame, Plus, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface GoodsDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

interface UserItem {
  id: string;
  title: string;
  image: string;
}

interface BackgroundPreset {
  id: string;
  name: string;
  icon?: any;
  prompt?: string;
  image_url?: string;
  user_id?: string;
  category: string;
}

const DEFAULT_PRESETS: BackgroundPreset[] = [
  {
    id: "shelf",
    name: "棚",
    icon: Box,
    prompt: "木製の棚が並ぶ清潔で明るい展示スペース。シンプルで洗練されたデザイン。自然光が差し込む雰囲気。",
    category: "shelf"
  },
  {
    id: "room",
    name: "部屋",
    icon: Home,
    prompt: "おしゃれな部屋のインテリア。壁には装飾があり、床は木目調。温かみのある照明。コレクションルームのような雰囲気。",
    category: "room"
  },
  {
    id: "showcase",
    name: "ショーケース",
    icon: StoreIcon,
    prompt: "ガラスのショーケースが並ぶ高級感のある展示スペース。スポットライトが当たる雰囲気。美術館やギャラリーのような空間。",
    category: "showcase"
  },
  {
    id: "display",
    name: "展示台",
    icon: Frame,
    prompt: "白い展示台が配置された広々としたギャラリースペース。ミニマルでモダンなデザイン。美しく整理された展示環境。",
    category: "display"
  }
];

export function GoodsDisplayModal({ isOpen, onClose, userId }: GoodsDisplayModalProps) {
  const [selectedItems, setSelectedItems] = useState<UserItem[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadPresetName, setUploadPresetName] = useState("");
  const [uploadPresetCategory, setUploadPresetCategory] = useState("shelf");
  const [uploadPresetFile, setUploadPresetFile] = useState<File | null>(null);
  const [uploadPresetPreview, setUploadPresetPreview] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  
  const queryClient = useQueryClient();

  // ユーザーのアイテムを取得
  const { data: userItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserItem[];
    },
    enabled: isOpen && !!userId,
  });

  // ユーザーアップロードの背景プリセットを取得
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

  // 展示場ギャラリーを取得
  const { data: displayGallery = [] } = useQuery({
    queryKey: ["display-gallery", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("display_gallery")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!userId,
  });

  // 背景プリセットをアップロード
  const uploadPresetMutation = useMutation({
    mutationFn: async () => {
      if (!uploadPresetFile || !userId) throw new Error("ファイルが選択されていません");

      // 画像をStorageにアップロード
      const fileExt = uploadPresetFile.name.split('.').pop();
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, uploadPresetFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      // データベースに保存
      const { error: dbError } = await supabase
        .from("background_presets")
        .insert({
          user_id: userId,
          name: uploadPresetName,
          image_url: publicUrl,
          category: uploadPresetCategory,
          is_public: true
        });

      if (dbError) throw dbError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["background-presets"] });
      toast.success("背景プリセットを追加しました");
      setShowUploadDialog(false);
      setUploadPresetName("");
      setUploadPresetFile(null);
      setUploadPresetPreview(null);
    },
    onError: (error) => {
      console.error("Error uploading preset:", error);
      toast.error("背景プリセットの追加に失敗しました");
    }
  });

  const handleItemToggle = (item: UserItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      }
      if (prev.length >= 5) {
        toast.error("最大5個まで選択できます");
        return prev;
      }
      return [...prev, item];
    });
  };

  const handlePresetSelect = async (preset: BackgroundPreset) => {
    // 選択状態をリセット
    setSelectedItems([]);
    setCustomPrompt("");
    
    // ユーザーアップロードのプリセットの場合は直接画像を使用
    if (preset.image_url) {
      setBackgroundImage(preset.image_url);
      setSelectedPreset(preset.id);
      return;
    }

    // デフォルトプリセットの場合はAI生成
    setIsGeneratingBackground(true);
    setSelectedPreset(preset.id);

    try {
      const { data, error } = await supabase.functions.invoke('generate-background', {
        body: { prompt: preset.prompt }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setBackgroundImage(data.imageUrl);
        
        // AI生成した背景画像をプリセットとして保存
        if (userId) {
          const { error: saveError } = await supabase
            .from("background_presets")
            .insert({
              user_id: userId,
              name: `AI生成 - ${preset.name}`,
              image_url: data.imageUrl,
              category: preset.category,
              is_public: true
            });

          if (saveError) {
            console.error("Error saving generated background:", saveError);
          } else {
            queryClient.invalidateQueries({ queryKey: ["background-presets"] });
          }
        }
        
        toast.success("背景画像を生成しました");
      } else {
        throw new Error("背景画像の生成に失敗しました");
      }
    } catch (error) {
      console.error("Error generating background:", error);
      toast.error(error instanceof Error ? error.message : "背景画像の生成に失敗しました");
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    setBackgroundFile(file);
    setSelectedPreset(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPresetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    setUploadPresetFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPresetPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
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
      // グッズ画像のURLを収集
      const itemImages = selectedItems.map(item => item.image);

      const defaultPrompt = `この背景画像に、選択されたグッズ（${selectedItems.map(i => i.title).join('、')}）を自然に配置して、魅力的な展示場の画像を生成してください。グッズは重ならないように配置し、全体的にバランスの取れた構図にしてください。`;
      const prompt = customPrompt.trim() || defaultPrompt;

      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl: backgroundImage,
          prompt,
          itemImages
        }
      });

      if (error) throw error;

      if (data?.editedImageUrl) {
        setGeneratedImage(data.editedImageUrl);
        
        // 展示場画像をギャラリーに保存
        if (userId) {
          const { error: galleryError } = await supabase
            .from("display_gallery")
            .insert({
              user_id: userId,
              image_url: data.editedImageUrl,
              item_ids: selectedItems.map(item => item.id),
              background_preset_id: selectedPreset
            });

          if (galleryError) {
            console.error("Error saving to gallery:", galleryError);
          } else {
            queryClient.invalidateQueries({ queryKey: ["display-gallery", userId] });
          }
        }
        
        toast.success("グッズ展示場の画像を生成しました！");
      } else {
        throw new Error("画像の生成に失敗しました");
      }
    } catch (error) {
      console.error("Error generating display:", error);
      toast.error(error instanceof Error ? error.message : "画像の生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `goods-display-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("画像をダウンロードしました");
  };

  const handleReset = () => {
    setSelectedItems([]);
    setBackgroundImage(null);
    setBackgroundFile(null);
    setGeneratedImage(null);
    setSelectedPreset(null);
    setSelectedCategory(null);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const handleSelectPreset = async (preset: BackgroundPreset) => {
    await handlePresetSelect(preset);
    setSelectedCategory(null);
  };

  // カテゴリごとにプリセットをグループ化
  const presetsByCategory = {
    shelf: [...DEFAULT_PRESETS.filter(p => p.category === "shelf"), ...userPresets.filter(p => p.category === "shelf")],
    room: [...DEFAULT_PRESETS.filter(p => p.category === "room"), ...userPresets.filter(p => p.category === "room")],
    showcase: [...DEFAULT_PRESETS.filter(p => p.category === "showcase"), ...userPresets.filter(p => p.category === "showcase")],
    display: [...DEFAULT_PRESETS.filter(p => p.category === "display"), ...userPresets.filter(p => p.category === "display")]
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              グッズ展示場
            </DialogTitle>
            {!generatedImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGallery(!showGallery)}
              >
                {showGallery ? "作成画面に戻る" : "ギャラリーを見る"}
              </Button>
            )}
          </DialogHeader>

          {generatedImage ? (
            <ScrollArea className="flex-1 px-1">
              <div className="space-y-4 pb-4">
                <div className="relative rounded-lg overflow-hidden border">
                  <img 
                    src={generatedImage} 
                    alt="Generated display" 
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="flex-1">
                    ダウンロード
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="flex-1">
                    最初から作り直す
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : showGallery ? (
            <ScrollArea className="flex-1 px-1">
              <div className="space-y-4 pb-4">
                <h3 className="text-lg font-semibold">展示場ギャラリー</h3>
                {displayGallery.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    まだ展示場を作成していません
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {displayGallery.map((item) => (
                      <div key={item.id} className="relative border rounded-lg overflow-hidden">
                        <img 
                          src={item.image_url} 
                          alt="Display" 
                          className="w-full h-auto"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("display_gallery")
                              .delete()
                              .eq("id", item.id);
                            
                            if (!error) {
                              queryClient.invalidateQueries({ queryKey: ["display-gallery", userId] });
                              toast.success("削除しました");
                            }
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="flex-1 px-1">
              <div className="space-y-6 pb-4">
                {/* 背景画像選択 */}
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
                          setBackgroundImage(null);
                          setBackgroundFile(null);
                          setSelectedPreset(null);
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
                          // カテゴリ詳細画面
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToCategories}
                              >
                                ← カテゴリ一覧に戻る
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setUploadPresetCategory(selectedCategory);
                                  setShowUploadDialog(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                背景を追加
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {presetsByCategory[selectedCategory as keyof typeof presetsByCategory]?.map((preset) => (
                                <Button
                                  key={preset.id}
                                  variant="outline"
                                  className="h-auto p-2 relative"
                                  onClick={() => handleSelectPreset(preset)}
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
                          // カテゴリ選択画面
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              カテゴリを選択して背景画像を管理
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3">
                              {DEFAULT_PRESETS.map((preset) => {
                                const categoryPresets = presetsByCategory[preset.category as keyof typeof presetsByCategory] || [];
                                const latestGeneratedImage = categoryPresets.find(p => p.image_url)?.image_url;
                                
                                return (
                                  <Button
                                    key={preset.id}
                                    variant="outline"
                                    className="h-auto flex-col gap-2 p-2 relative overflow-hidden"
                                    onClick={() => handleCategoryClick(preset.category)}
                                  >
                                    {latestGeneratedImage ? (
                                      <div className="w-full aspect-video relative rounded overflow-hidden">
                                        <img 
                                          src={latestGeneratedImage} 
                                          alt={preset.name}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          {preset.icon && <preset.icon className="w-8 h-8 text-white" />}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full aspect-video flex items-center justify-center bg-muted rounded">
                                        {preset.icon && <preset.icon className="w-8 h-8" />}
                                      </div>
                                    )}
                                    <span className="text-sm font-medium">{preset.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {categoryPresets.length}件
                                    </span>
                                  </Button>
                                );
                              })}
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

                {/* カスタムプロンプト */}
                {backgroundImage && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">生成プロンプト（オプション）</label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="生成する画像の説明を入力してください。空白の場合はデフォルトプロンプトが使用されます。"
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                {/* グッズ選択 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    展示するグッズを選択 ({selectedItems.length}/5)
                  </label>
                  <ScrollArea className="h-[240px] border rounded-lg p-4">
                    {isLoadingItems ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : userItems.length === 0 ? (
                      <p className="text-center text-muted-foreground p-8">
                        コレクションにグッズがありません
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {userItems.map((item) => {
                          const isSelected = selectedItems.some(i => i.id === item.id);
                          return (
                            <div
                              key={item.id}
                              className={`relative border rounded-lg p-2 cursor-pointer transition-all ${
                                isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                              }`}
                              onClick={() => handleItemToggle(item)}
                            >
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full aspect-square object-cover rounded mb-2"
                              />
                              <p className="text-xs truncate">{item.title}</p>
                              <Checkbox
                                checked={isSelected}
                                className="absolute top-2 right-2"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedItems.length === 0 || !backgroundImage}
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
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* 背景プリセットアップロードダイアログ */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>背景プリセットを追加</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">プリセット名</Label>
              <Input
                id="preset-name"
                value={uploadPresetName}
                onChange={(e) => setUploadPresetName(e.target.value)}
                placeholder="例: マイ棚"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset-category">カテゴリ</Label>
              <Select value={uploadPresetCategory} onValueChange={setUploadPresetCategory}>
                <SelectTrigger id="preset-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shelf">棚</SelectItem>
                  <SelectItem value="room">部屋</SelectItem>
                  <SelectItem value="showcase">ショーケース</SelectItem>
                  <SelectItem value="display">展示台</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>背景画像</Label>
              {uploadPresetPreview ? (
                <div className="relative border rounded-lg overflow-hidden">
                  <img 
                    src={uploadPresetPreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setUploadPresetFile(null);
                      setUploadPresetPreview(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8">
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      クリックして画像をアップロード
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadPresetFileChange}
                    />
                  </label>
                </div>
              )}
            </div>

            <Button
              onClick={() => uploadPresetMutation.mutate()}
              disabled={!uploadPresetName || !uploadPresetFile || uploadPresetMutation.isPending}
              className="w-full"
            >
              {uploadPresetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  アップロード中...
                </>
              ) : (
                "背景プリセットを追加"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
