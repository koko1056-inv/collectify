import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateChallenge } from "@/hooks/challenges";
import { Trophy, Calendar, Package, Search, X, Coins, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserPoints } from "@/hooks/usePoints";

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OfficialItem {
  id: string;
  title: string;
  image: string;
  content_name?: string;
}

export function CreateChallengeModal({ isOpen, onClose }: CreateChallengeModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("3");
  const [selectedItem, setSelectedItem] = useState<OfficialItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [firstPlacePoints, setFirstPlacePoints] = useState("100");
  const [secondPlacePoints, setSecondPlacePoints] = useState("50");
  const [thirdPlacePoints, setThirdPlacePoints] = useState("30");
  const createChallenge = useCreateChallenge();
  const { data: userPoints } = useUserPoints();

  const totalPrizePoints = (parseInt(firstPlacePoints) || 0) + (parseInt(secondPlacePoints) || 0) + (parseInt(thirdPlacePoints) || 0);
  const currentBalance = userPoints?.total_points || 0;
  const hasEnoughPoints = currentBalance >= totalPrizePoints;

  const { data: officialItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["official-items-search", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("official_items")
        .select("id, title, image, content_name")
        .order("created_at", { ascending: false })
        .limit(20);

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OfficialItem[];
    },
    enabled: isOpen,
  });

  const handleSubmit = () => {
    if (!title.trim()) return;

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + parseInt(duration));

    createChallenge.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        official_item_id: selectedItem?.id,
        ends_at: endsAt.toISOString(),
        first_place_points: parseInt(firstPlacePoints) || 100,
        second_place_points: parseInt(secondPlacePoints) || 50,
        third_place_points: parseInt(thirdPlacePoints) || 30,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setDuration("3");
          setSelectedItem(null);
          setSearchQuery("");
          setShowItemSearch(false);
          setFirstPlacePoints("100");
          setSecondPlacePoints("50");
          setThirdPlacePoints("30");
          onClose();
        },
      }
    );
  };

  const handleItemSelect = (item: OfficialItem) => {
    setSelectedItem(item);
    setShowItemSearch(false);
    setSearchQuery("");
  };

  const handleRemoveItem = () => {
    setSelectedItem(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            チャレンジを作成
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-4">
            <div>
              <Label htmlFor="title">テーマ</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: グッズのおしゃれな飾り方"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="チャレンジの詳細や参加条件など"
                className="mt-1"
                rows={3}
              />
            </div>

            {/* グッズ選択セクション */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" />
                対象グッズ（任意）
              </Label>
              
              {selectedItem ? (
                <div className="relative flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.title}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">{selectedItem.title}</p>
                    {selectedItem.content_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedItem.content_name}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveItem}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="グッズを検索..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowItemSearch(true);
                      }}
                      onFocus={() => setShowItemSearch(true)}
                      className="pl-9"
                    />
                  </div>

                  {showItemSearch && (
                    <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
                      <div className="max-h-48 overflow-y-auto">
                        {isLoadingItems ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            読み込み中...
                          </div>
                        ) : officialItems.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            グッズが見つかりません
                          </div>
                        ) : (
                          <div className="divide-y">
                            {officialItems.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleItemSelect(item)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors text-left"
                              >
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                                  {item.content_name && (
                                    <p className="text-xs text-muted-foreground">{item.content_name}</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                特定のグッズに関連するチャレンジの場合に選択してください
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                開催期間
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1日間</SelectItem>
                  <SelectItem value="3">3日間</SelectItem>
                  <SelectItem value="7">1週間</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4" />
                入賞ポイント
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">🥇 1位</Label>
                  <Input
                    type="number"
                    min="0"
                    value={firstPlacePoints}
                    onChange={(e) => setFirstPlacePoints(e.target.value)}
                    className="mt-1"
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">🥈 2位</Label>
                  <Input
                    type="number"
                    min="0"
                    value={secondPlacePoints}
                    onChange={(e) => setSecondPlacePoints(e.target.value)}
                    className="mt-1"
                    placeholder="50"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">🥉 3位</Label>
                  <Input
                    type="number"
                    min="0"
                    value={thirdPlacePoints}
                    onChange={(e) => setThirdPlacePoints(e.target.value)}
                    className="mt-1"
                    placeholder="30"
                  />
                </div>
              </div>
              
              {/* 合計と残高表示 */}
              <div className={`mt-3 p-3 rounded-lg ${hasEnoughPoints ? 'bg-muted/50' : 'bg-destructive/10 border border-destructive/30'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4" />
                    必要ポイント
                  </span>
                  <span className="font-bold">{totalPrizePoints}pt</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">あなたの残高</span>
                  <span className={hasEnoughPoints ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                    {currentBalance}pt
                  </span>
                </div>
                {!hasEnoughPoints && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive mt-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    ポイントが不足しています
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-1.5">
                作成時にあなたのポイントから賞金プールが差し引かれます
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createChallenge.isPending || !hasEnoughPoints}
            className="flex-1"
          >
            {createChallenge.isPending ? "作成中..." : `作成 (-${totalPrizePoints}pt)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}