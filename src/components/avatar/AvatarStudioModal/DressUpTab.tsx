import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight, Loader2, Shirt, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { useAvatars } from "@/hooks/useAvatars";

interface UserItem {
  id: string;
  title: string;
  image: string;
}

interface Props {
  avatars: ReturnType<typeof useAvatars>;
  userId: string;
  initialBaseAvatarUrl: string | null;
  onDone: () => void;
}

export function DressUpTab({ avatars, userId, initialBaseAvatarUrl, onDone }: Props) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(
    initialBaseAvatarUrl || avatars.baseAvatars[0]?.image_url || ""
  );
  const [isWorking, setIsWorking] = useState(false);

  // 初期ベースアバターの自動設定
  useEffect(() => {
    if (!selectedAvatarUrl && avatars.baseAvatars.length > 0) {
      setSelectedAvatarUrl(initialBaseAvatarUrl || avatars.baseAvatars[0].image_url);
    }
  }, [avatars.baseAvatars, initialBaseAvatarUrl, selectedAvatarUrl]);

  // ユーザーアイテム取得
  useEffect(() => {
    if (!userId) return;
    setLoadingItems(true);
    supabase
      .from("user_items")
      .select("id, title, image")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setItems((data as UserItem[]) || []);
        setLoadingItems(false);
      });
  }, [userId]);

  const toggleItem = (id: string) =>
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleDressUp = async () => {
    if (!selectedAvatarUrl) {
      toast.error("ベースアバターを選択してください");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("グッズを選択してください");
      return;
    }
    setIsWorking(true);
    try {
      const selected = items.filter((i) => selectedItems.includes(i.id));
      const basePrompt = customPrompt.trim()
        ? customPrompt
        : `選択されたベースアバターの顔、髪型、表情を保持しながら、以下のグッズを装着：${selected
            .map((i) => i.title)
            .join(", ")}`;

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl: selectedAvatarUrl,
          prompt: basePrompt,
          itemImages: selected.map((i) => i.image),
        },
      });
      if (error) throw error;
      if (!data?.editedImageUrl) throw new Error("画像が生成されませんでした");

      await avatars.saveGenerated.mutateAsync({
        imageUrl: data.editedImageUrl,
        prompt: `着せ替え: ${selected.map((i) => i.title).join(", ")}`,
        itemIds: selectedItems,
      });

      toast.success("🎉 着せ替えが完了しました");
      setSelectedItems([]);
      setCustomPrompt("");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "着せ替えに失敗しました");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ベースアバター */}
      {avatars.baseAvatars.length > 0 ? (
        <div className="space-y-2 p-4 bg-muted/30 rounded-xl border">
          <Label className="text-sm">ベースアバター</Label>
          <RadioGroup value={selectedAvatarUrl} onValueChange={setSelectedAvatarUrl}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {avatars.baseAvatars.slice(0, 8).map((a) => (
                <label
                  key={a.id}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 flex-shrink-0 ${
                    selectedAvatarUrl === a.image_url
                      ? "border-primary shadow-lg ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={a.image_url} className="object-cover" />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <RadioGroupItem
                    value={a.image_url}
                    className="absolute top-1 right-1 bg-background h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>
      ) : (
        <div className="p-6 bg-muted/30 rounded-xl border text-center">
          <User className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            まずAIアバターを生成してください
          </p>
        </div>
      )}

      {/* グッズ */}
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            グッズがありません
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                  selectedItems.includes(item.id)
                    ? "border-primary shadow-md ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <div className="aspect-square bg-muted">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
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

      {/* カスタム指示 */}
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
        disabled={isWorking || !selectedAvatarUrl || selectedItems.length === 0}
        className="w-full h-12 text-base gap-2"
      >
        {isWorking ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            着せ替え中...
          </>
        ) : (
          <>
            <Shirt className="w-5 h-5" />
            着せ替えを実行
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
}
