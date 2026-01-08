import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Upload,
  X,
  Wand2,
  Shirt,
  Image as ImageIcon,
  Check,
  Trash2,
  ChevronRight,
  User,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ensureProfileImagesPublicUrl, setCurrentAvatar } from "@/utils/avatar-storage";
import type { AvatarGenerationResult } from "@/types/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AvatarStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl: string | null;
  onAvatarGenerated?: (result: AvatarGenerationResult) => void | Promise<void>;
}

interface AvatarItem {
  id: string;
  image_url: string;
  created_at: string;
  is_current: boolean;
  prompt?: string;
  item_ids?: string[];
}

const EXAMPLE_PROMPTS = [
  "明るい笑顔、カジュアルな服装",
  "クールな雰囲気、眼鏡をかけている",
  "可愛い猫耳、カラフルな衣装",
  "優しい雰囲気、落ち着いた色の服",
];

export function AvatarStudioModal({
  isOpen,
  onClose,
  userId,
  currentAvatarUrl,
  onAvatarGenerated,
}: AvatarStudioModalProps) {
  const [activeTab, setActiveTab] = useState("generate");
  const { toast } = useToast();

  // 生成タブの状態
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  // 着せ替えタブの状態
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [availableAvatars, setAvailableAvatars] = useState<AvatarItem[]>([]);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);

  // ギャラリータブの状態
  const [galleryAvatars, setGalleryAvatars] = useState<AvatarItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAvatars();
      fetchUserItems();
      fetchGalleryAvatars();
    } else {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setPrompt("");
    setUploadedImage(null);
    setPreviewUrl(null);
    setProgress(0);
    setGenerationStep("");
    setGeneratedPreview(null);
    setSelectedItems([]);
    setCustomPrompt("");
    setSelectedAvatarUrl("");
  };

  const fetchAvailableAvatars = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, item_ids, prompt, is_current, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        const pureAvatars = data.filter(
          (avatar) => !avatar.item_ids || avatar.item_ids.length === 0
        );
        setAvailableAvatars(pureAvatars);
        if (pureAvatars.length > 0 && !selectedAvatarUrl) {
          setSelectedAvatarUrl(pureAvatars[0].image_url);
        }
      }
    } catch (error) {
      console.error("Error fetching avatars:", error);
    }
  };

  const fetchUserItems = async () => {
    if (!userId) return;
    setLoadingItems(true);
    try {
      const { data } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchGalleryAvatars = async () => {
    if (!userId) return;
    setLoadingGallery(true);
    try {
      const { data } = await supabase
        .from("avatar_gallery")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setGalleryAvatars(data || []);
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoadingGallery(false);
    }
  };

  // === 生成タブのハンドラ ===
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadedImage(null);
    setPreviewUrl(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) {
      toast({
        variant: "destructive",
        title: "入力が必要です",
        description: "説明または写真を入力してください",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGenerationStep("準備中...");
    setGeneratedPreview(null);

    try {
      setProgress(20);
      setGenerationStep("画像を処理中...");
      
      let imageBase64: string | undefined;
      if (uploadedImage) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(uploadedImage);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      }

      setProgress(40);
      setGenerationStep("AIがアバターを生成中...");

      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: {
          prompt: prompt.trim() || "この写真を3Dアニメーションスタイルのキャラクターに変換してください",
          imageUrl: imageBase64,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (!data.imageUrl) throw new Error("画像URLが取得できませんでした");

      setProgress(70);
      setGenerationStep("アバターを保存中...");
      setGeneratedPreview(data.imageUrl);

      const usedPrompt = prompt.trim() || (uploadedImage ? "写真から生成" : "AIアバター");
      if (onAvatarGenerated) {
        await onAvatarGenerated({ imageUrl: data.imageUrl, prompt: usedPrompt });
      }

      setProgress(100);
      setGenerationStep("完了！");

      toast({
        title: "🎉 アバター生成完了",
        description: "新しいアバターがギャラリーに追加されました",
      });

      // データ更新
      await fetchAvailableAvatars();
      await fetchGalleryAvatars();
      
      setPrompt("");
      handleRemoveImage();
    } catch (error: any) {
      console.error("Avatar generation error:", error);
      toast({
        variant: "destructive",
        title: "生成エラー",
        description: error.message || "アバター生成に失敗しました",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // === 着せ替えタブのハンドラ ===
  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleDressUp = async () => {
    if (selectedItems.length === 0) {
      toast({ title: "グッズを選択してください" });
      return;
    }
    if (!selectedAvatarUrl) {
      toast({ title: "アバターを選択してください" });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGenerationStep("着せ替え準備中...");

    try {
      setProgress(30);
      setGenerationStep("グッズを合成中...");

      const selectedItemsData = items.filter((item) => selectedItems.includes(item.id));
      const basePrompt = customPrompt.trim()
        ? customPrompt
        : `選択されたベースアバターの顔、髪型、表情を保持しながら、以下のグッズを装着：${selectedItemsData.map((item) => item.title).join(", ")}`;

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl: selectedAvatarUrl,
          prompt: basePrompt,
          itemImages: selectedItemsData.map((item) => item.image),
        },
      });

      if (error) throw error;

      setProgress(70);
      setGenerationStep("アバターを保存中...");

      if (data?.editedImageUrl) {
        await supabase.from("avatar_gallery").insert({
          user_id: userId,
          image_url: data.editedImageUrl,
          prompt: `着せ替え: ${selectedItemsData.map((item) => item.title).join(", ")}`,
          item_ids: selectedItems,
          is_current: true,
        });

        await supabase
          .from("avatar_gallery")
          .update({ is_current: false })
          .neq("image_url", data.editedImageUrl)
          .eq("user_id", userId);

        await supabase.from("profiles").update({ avatar_url: data.editedImageUrl }).eq("id", userId);

        setProgress(100);
        setGenerationStep("完了！");

        toast({
          title: "🎉 着せ替え完了",
          description: "新しいアバターがプロフィールに設定されました",
        });

        await fetchGalleryAvatars();
        setSelectedItems([]);
        setCustomPrompt("");
        setActiveTab("gallery");
      }
    } catch (error: any) {
      console.error("Dress up error:", error);
      toast({
        variant: "destructive",
        title: "着せ替えエラー",
        description: error.message || "着せ替えに失敗しました",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setGenerationStep("");
    }
  };

  // === ギャラリータブのハンドラ ===
  const handleSelectAvatar = async (avatarUrl: string, avatarId: string) => {
    try {
      const stableUrl = await ensureProfileImagesPublicUrl({ userId, sourceUrl: avatarUrl });
      await setCurrentAvatar({ userId, avatarUrl: stableUrl, avatarGalleryId: avatarId });

      toast({
        title: "✅ アバターを変更しました",
        description: "プロフィールが更新されました",
      });

      await fetchGalleryAvatars();
    } catch (error) {
      console.error("Error selecting avatar:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの変更に失敗しました",
      });
    }
  };

  const handleDeleteAvatar = async (avatarId: string) => {
    try {
      await supabase.from("avatar_gallery").delete().eq("id", avatarId);
      toast({ title: "削除しました" });
      await fetchGalleryAvatars();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast({ variant: "destructive", title: "削除に失敗しました" });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              アバタースタジオ
            </DialogTitle>
            <DialogDescription>
              AIでアバターを生成・着せ替え・管理
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 grid grid-cols-3 h-12">
              <TabsTrigger value="generate" className="gap-2">
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">生成</span>
              </TabsTrigger>
              <TabsTrigger value="dressup" className="gap-2">
                <Shirt className="w-4 h-4" />
                <span className="hidden sm:inline">着せ替え</span>
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-2 relative">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">ギャラリー</span>
                {galleryAvatars.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                    {galleryAvatars.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 生成中のオーバーレイ */}
            {isGenerating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto animate-pulse">
                      <Wand2 className="w-10 h-10 text-primary" />
                    </div>
                    {generatedPreview && (
                      <img
                        src={generatedPreview}
                        alt="Generated"
                        className="absolute inset-0 w-24 h-24 rounded-full object-cover mx-auto animate-fade-in"
                      />
                    )}
                  </div>
                  <p className="text-lg font-medium">{generationStep}</p>
                  <Progress value={progress} className="w-64 h-2" />
                  <div className="flex justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 px-6 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 220px)' }}>
              {/* 生成タブ */}
              <TabsContent value="generate" className="mt-4 space-y-4">
                {/* 写真アップロード */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    写真から生成（オプション）
                  </Label>
                  {previewUrl ? (
                    <div className="relative group">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-xl border-2 border-primary/30"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-2 right-2">
                        <Badge variant="secondary" className="bg-background/80">
                          3Dキャラクターに変換されます
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all group">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm text-muted-foreground mt-2">クリックで写真を選択</span>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* プロンプト入力 */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">アバターの説明</Label>
                  <Textarea
                    id="prompt"
                    placeholder="例：青い髪で眼鏡をかけた女の子..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* サンプルプロンプト */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">クイック選択</Label>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((example, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(example)}
                        className="text-xs h-8"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>

              </TabsContent>

              {/* 着せ替えタブ */}
              <TabsContent value="dressup" className="mt-4 space-y-4">
                {/* ベースアバター選択 */}
                {availableAvatars.length > 0 ? (
                  <div className="space-y-2 p-4 bg-muted/30 rounded-xl border">
                    <Label className="text-sm">ベースアバター</Label>
                    <RadioGroup value={selectedAvatarUrl} onValueChange={setSelectedAvatarUrl}>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {availableAvatars.slice(0, 5).map((avatar) => (
                          <label
                            key={avatar.id}
                            className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                              selectedAvatarUrl === avatar.image_url
                                ? "border-primary shadow-lg ring-2 ring-primary/30"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={avatar.image_url} className="object-cover" />
                              <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
                            </Avatar>
                            <RadioGroupItem
                              value={avatar.image_url}
                              className="absolute top-1 right-1 bg-background h-4 w-4"
                            />
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      まずAIアバターを生成してください
                    </p>
                  </div>
                ) : (
                  <div className="p-6 bg-muted/30 rounded-xl border text-center">
                    <User className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      まずAIアバターを生成してください
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("generate")}>
                      生成タブへ
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}

                {/* グッズ選択 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>グッズを選択</Label>
                    {selectedItems.length > 0 && (
                      <Badge variant="default">{selectedItems.length}個選択中</Badge>
                    )}
                  </div>

                  {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      グッズがありません
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            selectedItems.includes(item.id)
                              ? "border-primary shadow-md ring-2 ring-primary/30"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => toggleItem(item.id)}
                        >
                          <div className="aspect-square bg-muted">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute top-1 right-1">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              className="bg-background h-4 w-4"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* カスタムプロンプト */}
                <div className="space-y-2">
                  <Label htmlFor="custom-prompt" className="text-muted-foreground text-xs">
                    カスタム指示（オプション）
                  </Label>
                  <Textarea
                    id="custom-prompt"
                    placeholder="例：Tシャツとして着せてください..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                <Button
                  onClick={handleDressUp}
                  disabled={isGenerating || selectedItems.length === 0 || !selectedAvatarUrl}
                  className="w-full h-12 text-base gap-2"
                >
                  <Shirt className="w-5 h-5" />
                  着せ替えを実行
                </Button>
              </TabsContent>

              {/* ギャラリータブ */}
              <TabsContent value="gallery" className="mt-4 space-y-4">
                {loadingGallery ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : galleryAvatars.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">まだアバターがありません</p>
                    <Button variant="outline" onClick={() => setActiveTab("generate")}>
                      アバターを生成する
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryAvatars.map((avatar) => (
                      <div
                        key={avatar.id}
                        className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                          avatar.image_url === currentAvatarUrl
                            ? "border-primary shadow-lg ring-2 ring-primary/30"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="aspect-square bg-muted">
                          <img src={avatar.image_url} alt="Avatar" className="w-full h-full object-cover" />
                        </div>

                        {/* バッジ */}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {avatar.image_url === currentAvatarUrl && (
                            <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                              <Check className="w-3 h-3" />
                              使用中
                            </Badge>
                          )}
                          {avatar.item_ids && avatar.item_ids.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Shirt className="w-3 h-3 mr-1" />
                              {avatar.item_ids.length}
                            </Badge>
                          )}
                        </div>

                        {/* ホバーアクション */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSelectAvatar(avatar.image_url, avatar.id)}
                            disabled={avatar.image_url === currentAvatarUrl}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            選択
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteId(avatar.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* 日付 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-xs text-white">
                            {new Date(avatar.created_at).toLocaleDateString("ja-JP")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>

            {/* 固定フッター - 生成ボタン */}
            {activeTab === "generate" && (
              <div className="px-6 py-4 border-t bg-background">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
                  className="w-full h-12 text-base gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  アバターを生成
                </Button>
              </div>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteAvatar(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
