import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Loader2, Check, X, Sparkles, ArrowLeft, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CategoryTagSelect } from "@/components/tag/CategoryTagSelect";
import { useQuery } from "@tanstack/react-query";

interface AnalysisResult {
  title: string;
  description: string;
  price: string;
  category: string;
  contentName: string;
  characterName: string;
}

interface SelectedTags {
  character: string | null;
  type: string | null;
  series: string | null;
}

type Step = "capture" | "analyzing" | "confirm" | "complete";

interface QuickAddFlowProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function QuickAddFlow({ onComplete, onCancel }: QuickAddFlowProps) {
  const [step, setStep] = useState<Step>("capture");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedData, setEditedData] = useState<AnalysisResult | null>(null);
  const [selectedTags, setSelectedTags] = useState<SelectedTags>({
    character: null,
    type: null,
    series: null,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // コンテンツ名からcontent_idを取得
  const { data: contentId } = useQuery({
    queryKey: ["content-id", editedData?.contentName],
    queryFn: async () => {
      if (!editedData?.contentName) return null;
      const { data } = await supabase
        .from("content_names")
        .select("id")
        .eq("name", editedData.contentName)
        .single();
      return data?.id || null;
    },
    enabled: !!editedData?.contentName,
  });

  const handleFileSelect = useCallback(async (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // 自動的にAI分析を開始
    setStep("analyzing");
    
    try {
      // Base64に変換
      const reader = new FileReader();
      const base64Url = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('analyze-item-image', {
        body: { imageUrl: base64Url }
      });

      if (error) throw error;

      const result: AnalysisResult = {
        title: data.title || "",
        description: data.description || "",
        price: data.price || "",
        category: data.category || "",
        contentName: data.contentName || "",
        characterName: data.characterName || "",
      };

      setAnalysisResult(result);
      setEditedData(result);
      setStep("confirm");
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast({
        title: "分析エラー",
        description: "画像の分析に失敗しました。手動で入力してください。",
        variant: "destructive",
      });
      // エラー時も確認画面へ（空のデータで）
      const emptyResult: AnalysisResult = {
        title: "",
        description: "",
        price: "",
        category: "",
        contentName: "",
        characterName: "",
      };
      setAnalysisResult(emptyResult);
      setEditedData(emptyResult);
      setStep("confirm");
    }
  }, [toast]);

  const handleSubmit = async () => {
    if (!user || !imageFile || !editedData) return;

    setIsSubmitting(true);
    try {
      // 画像をアップロード
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      // 1. official_itemsに追加（探索に表示されるように）
      const { data: officialItem, error: officialInsertError } = await supabase
        .from('official_items')
        .insert({
          title: editedData.title || "無題のグッズ",
          image: publicUrl,
          price: editedData.price || "0",
          release_date: new Date().toISOString().split('T')[0],
          content_name: editedData.contentName || null,
          description: editedData.description || null,
          item_type: editedData.category || "goods",
          created_by: user.id,
        })
        .select()
        .single();

      if (officialInsertError) throw officialInsertError;

      // 2. タグを保存
      for (const [category, tagName] of Object.entries(selectedTags)) {
        if (tagName) {
          // タグIDを取得
          const { data: tagData } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .eq('category', category)
            .single();

          if (tagData) {
            await supabase.from('item_tags').insert({
              official_item_id: officialItem.id,
              tag_id: tagData.id,
            });
          }
        }
      }

      // 3. user_itemsに追加（自分のコレクションへ）
      const { data: userItem, error: userInsertError } = await supabase
        .from('user_items')
        .insert({
          user_id: user.id,
          title: editedData.title || "無題のグッズ",
          image: publicUrl,
          prize: editedData.price || "0",
          release_date: new Date().toISOString(),
          content_name: editedData.contentName || null,
          note: editedData.description || null,
          official_item_id: officialItem.id,
        })
        .select()
        .single();

      if (userInsertError) throw userInsertError;

      // 4. user_item_tagsにもタグを保存
      for (const [category, tagName] of Object.entries(selectedTags)) {
        if (tagName) {
          const { data: tagData } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .eq('category', category)
            .single();

          if (tagData) {
            await supabase.from('user_item_tags').insert({
              user_item_id: userItem.id,
              tag_id: tagData.id,
            });
          }
        }
      }

      setStep("complete");
      
      // 2秒後に自動で閉じる
      setTimeout(() => {
        onComplete?.();
      }, 2000);

    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        title: "保存エラー",
        description: "グッズの保存に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("capture");
    setImageFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setEditedData(null);
    setSelectedTags({ character: null, type: null, series: null });
  };

  return (
    <div className="min-h-[60vh] flex flex-col">
      <AnimatePresence mode="wait">
        {/* Step 1: キャプチャ */}
        {step === "capture" && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">グッズを追加</h2>
              <p className="text-muted-foreground text-sm">
                写真を撮影するか、画像を選択してください
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              {/* カメラで撮影 */}
              <Button
                variant="outline"
                className="flex-1 h-32 flex-col gap-3 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-10 h-10 text-primary" />
                <span className="font-medium">カメラで撮影</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* ギャラリーから選択 */}
              <Button
                variant="outline"
                className="flex-1 h-32 flex-col gap-3 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-primary" />
                <span className="font-medium">ギャラリーから</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="mt-4">
                キャンセル
              </Button>
            )}
          </motion.div>
        )}

        {/* Step 2: AI分析中 */}
        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
          >
            {previewUrl && (
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Sparkles className="w-10 h-10 text-white mx-auto animate-pulse" />
                    <p className="text-white font-medium text-sm">AI分析中...</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>グッズ情報を自動認識しています</span>
            </div>
          </motion.div>
        )}

        {/* Step 3: 確認・編集 */}
        {step === "confirm" && editedData && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 p-4 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold flex-1">内容を確認</h2>
            </div>

            {/* 画像プレビュー */}
            {previewUrl && (
              <div className="relative w-full max-w-xs mx-auto aspect-square rounded-xl overflow-hidden shadow-lg">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  AI認識完了
                </div>
              </div>
            )}

            {/* 編集フォーム */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">商品名</Label>
                  <Input
                    id="title"
                    value={editedData.title}
                    onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                    placeholder="商品名を入力"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">価格</Label>
                    <Input
                      id="price"
                      value={editedData.price}
                      onChange={(e) => setEditedData({ ...editedData, price: e.target.value })}
                      placeholder="0"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ</Label>
                    <Input
                      id="category"
                      value={editedData.category}
                      onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                      placeholder="カテゴリ"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contentName">作品名</Label>
                  <Input
                    id="contentName"
                    value={editedData.contentName}
                    onChange={(e) => setEditedData({ ...editedData, contentName: e.target.value })}
                    placeholder="作品名を入力"
                  />
                </div>
              </CardContent>
            </Card>

            {/* タグ選択 */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="w-4 h-4" />
                  タグを設定
                </div>
                
                <CategoryTagSelect
                  category="character"
                  label="キャラクター"
                  value={selectedTags.character}
                  onChange={(value) => setSelectedTags(prev => ({ ...prev, character: value }))}
                  contentId={contentId}
                />
                
                <CategoryTagSelect
                  category="type"
                  label="グッズタイプ"
                  value={selectedTags.type}
                  onChange={(value) => setSelectedTags(prev => ({ ...prev, type: value }))}
                />
                
                <CategoryTagSelect
                  category="series"
                  label="シリーズ"
                  value={selectedTags.series}
                  onChange={(value) => setSelectedTags(prev => ({ ...prev, series: value }))}
                  contentId={contentId}
                />

                {/* 選択中のタグ表示 */}
                {(selectedTags.character || selectedTags.type || selectedTags.series) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {selectedTags.character && (
                      <Badge variant="secondary">{selectedTags.character}</Badge>
                    )}
                    {selectedTags.type && (
                      <Badge variant="outline">{selectedTags.type}</Badge>
                    )}
                    {selectedTags.series && (
                      <Badge variant="outline">{selectedTags.series}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* アクションボタン */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReset}
              >
                やり直す
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSubmit}
                disabled={isSubmitting || !editedData.title}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    コレクションに追加
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: 完了 */}
        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>

            <div className="text-center space-y-2">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-green-600"
              >
                追加しました！
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                コレクションに追加されました
              </motion.p>
            </div>

            {/* キラキラエフェクト */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-2"
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: [0, 1.2, 1], rotate: [0, 180] }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                  className="text-2xl"
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleReset}>
                もう1つ追加
              </Button>
              <Button onClick={onComplete}>
                完了
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
