import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Loader2,
  ImageIcon,
  Check,
  AlertCircle,
  Upload,
  Sparkles,
} from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";

interface ScrapedImage {
  url: string;
  title: string | null;
}

interface AnalyzedItem {
  imageUrl: string;
  title: string;
  description: string;
  price: string;
  category: string;
  contentName: string;
  characterName: string;
  selected: boolean;
  status: "pending" | "analyzing" | "done" | "error";
  error?: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"url" | "select" | "analyze" | "import">("url");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [bulkContentName, setBulkContentName] = useState("");
  const [contentSuggestions, setContentSuggestions] = useState<string[]>([]);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({
        title: "エラー",
        description: "URLを入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-images", {
        body: { url },
      });

      if (error) throw error;

      const images = data.images || [];
      if (images.length === 0) {
        toast({
          title: "画像が見つかりません",
          description: "このURLから画像を取得できませんでした",
          variant: "destructive",
        });
        return;
      }

      setScrapedImages(images);
      setStep("select");
      toast({
        title: "スクレイピング完了",
        description: `${images.length}件の画像を取得しました`,
      });
    } catch (error) {
      console.error("Scrape error:", error);
      toast({
        title: "スクレイピングエラー",
        description: "画像の取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageUrl)) {
      newSelected.delete(imageUrl);
    } else {
      if (newSelected.size >= 20) {
        toast({
          title: "選択上限",
          description: "一度に選択できるのは20件までです",
          variant: "destructive",
        });
        return;
      }
      newSelected.add(imageUrl);
    }
    setSelectedImages(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set<string>();
    scrapedImages.slice(0, 20).forEach((img) => newSelected.add(img.url));
    setSelectedImages(newSelected);
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const handleAnalyze = async () => {
    if (selectedImages.size === 0) {
      toast({
        title: "エラー",
        description: "画像を選択してください",
        variant: "destructive",
      });
      return;
    }

    setStep("analyze");
    const images = Array.from(selectedImages);
    const items: AnalyzedItem[] = images.map((imageUrl) => ({
      imageUrl,
      title: "",
      description: "",
      price: "0",
      category: "",
      contentName: "",
      characterName: "",
      selected: true,
      status: "pending",
    }));
    setAnalyzedItems(items);

    // AI分析を順次実行
    for (let i = 0; i < items.length; i++) {
      setAnalyzedItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: "analyzing" } : item
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke(
          "analyze-item-image",
          {
            body: { imageUrl: items[i].imageUrl, sourceUrl: url },
          }
        );

        if (error) throw error;

        setAnalyzedItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  title: data.title || "不明なグッズ",
                  description: data.description || "",
                  price: data.price || "0",
                  category: data.category || "",
                  contentName: data.contentName || "",
                  characterName: data.characterName || "",
                  status: "done",
                }
              : item
          )
        );
      } catch (error) {
        console.error("Analyze error:", error);
        setAnalyzedItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: "error", error: "分析に失敗しました" }
              : item
          )
        );
      }

      setAnalyzeProgress(((i + 1) / items.length) * 100);
    }

    await loadContentSuggestions();
    setStep("import");
  };

  const toggleItemSelection = (index: number) => {
    setAnalyzedItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleImport = async () => {
    const itemsToImport = analyzedItems.filter(
      (item) => item.selected && item.status === "done"
    );

    if (itemsToImport.length === 0) {
      toast({
        title: "エラー",
        description: "インポートするアイテムを選択してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let successCount = 0;

    // 未登録のコンテンツ名をcontent_namesに自動登録
    const uniqueContentNames = Array.from(
      new Set(itemsToImport.map((i) => i.contentName?.trim()).filter(Boolean))
    ) as string[];
    for (const name of uniqueContentNames) {
      if (!contentSuggestions.includes(name)) {
        await supabase
          .from("content_names")
          .insert({ name, type: "other", created_by: user?.id });
      }
    }

    for (let i = 0; i < itemsToImport.length; i++) {
      const item = itemsToImport[i];

      try {
        // official_itemsに挿入
        const { error } = await supabase.from("official_items").insert({
          title: item.title,
          description: item.description,
          image: item.imageUrl,
          price: item.price || "0",
          release_date: new Date().toISOString().split("T")[0],
          content_name: item.contentName || null,
          item_type: "official",
          created_by: user?.id,
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error("Import error:", error);
      }

      setImportProgress(((i + 1) / itemsToImport.length) * 100);
    }

    await queryClient.invalidateQueries({ queryKey: ["official-items"] });

    toast({
      title: "インポート完了",
      description: `${successCount}件のグッズをインポートしました`,
    });

    handleClose();
  };

  const handleClose = () => {
    setStep("url");
    setUrl("");
    setScrapedImages([]);
    setSelectedImages(new Set());
    setAnalyzedItems([]);
    setAnalyzeProgress(0);
    setImportProgress(0);
    setIsLoading(false);
    setBulkContentName("");
    onClose();
  };

  const loadContentSuggestions = async () => {
    const { data } = await supabase
      .from("content_names")
      .select("name")
      .order("name");
    setContentSuggestions((data || []).map((c: any) => c.name));
  };

  const applyBulkContentName = () => {
    const name = bulkContentName.trim();
    if (!name) return;
    setAnalyzedItems((prev) =>
      prev.map((item) => ({ ...item, contentName: name }))
    );
    toast({
      title: "適用しました",
      description: `全${analyzedItems.length}件のコンテンツを「${name}」に設定しました`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            サイトからグッズを一括インポート
          </DialogTitle>
          <DialogDescription>
            {step === "url" && "グッズ情報が掲載されているWebページのURLを入力してください"}
            {step === "select" && "インポートする画像を選択してください（最大20件）"}
            {step === "analyze" && "AIが画像を分析しています..."}
            {step === "import" && "インポートするアイテムを確認してください"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Step 1: URL入力 */}
          {step === "url" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/goods"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleScrape} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "取得"
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                <p className="font-medium mb-2">💡 ヒント</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>グッズ一覧ページのURLを入力すると効果的です</li>
                  <li>商品画像が含まれるページを選んでください</li>
                  <li>AIが自動で商品名や説明を推測します</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: 画像選択 */}
          {step === "select" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedImages.size}件選択中 / {scrapedImages.length}件
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    全選択
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    全解除
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {scrapedImages.map((image, index) => (
                    <div
                      key={index}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImages.has(image.url)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => toggleImageSelection(image.url)}
                    >
                      <LazyImage
                        src={image.url}
                        alt={image.title || `画像 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedImages.has(image.url) && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStep("url")}>
                  戻る
                </Button>
                <Button onClick={handleAnalyze} disabled={selectedImages.size === 0}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI分析を開始 ({selectedImages.size}件)
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: AI分析中 */}
          {step === "analyze" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>分析中...</span>
                  <span>{Math.round(analyzeProgress)}%</span>
                </div>
                <Progress value={analyzeProgress} />
              </div>

              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {analyzedItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="w-12 h-12 rounded overflow-hidden shrink-0">
                        <LazyImage
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.status === "pending" && (
                          <span className="text-sm text-muted-foreground">待機中...</span>
                        )}
                        {item.status === "analyzing" && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">分析中...</span>
                          </div>
                        )}
                        {item.status === "done" && (
                          <div>
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.contentName} / {item.category}
                            </p>
                          </div>
                        )}
                        {item.status === "error" && (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{item.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 4: インポート確認 */}
          {step === "import" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                インポートするアイテムを確認してチェックを入れてください
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>インポート中...</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}

              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {analyzedItems.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        item.status === "done" ? "bg-card" : "bg-muted/30 opacity-50"
                      }`}
                    >
                      {item.status === "done" && (
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItemSelection(index)}
                          className="mt-1"
                        />
                      )}
                      <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                        <LazyImage
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.title || "取得失敗"}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {item.contentName && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {item.contentName}
                            </span>
                          )}
                          {item.category && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                          )}
                          {item.price && item.price !== "0" && (
                            <span className="text-xs text-muted-foreground">
                              ¥{parseInt(item.price).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    isLoading ||
                    analyzedItems.filter((i) => i.selected && i.status === "done")
                      .length === 0
                  }
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  インポート (
                  {analyzedItems.filter((i) => i.selected && i.status === "done").length}
                  件)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
