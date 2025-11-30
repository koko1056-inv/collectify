import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Grid3x3 } from "lucide-react";
import { useBinder } from "@/hooks/useBinder";
import { useAuth } from "@/contexts/AuthContext";

export default function BinderCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const binderId = searchParams.get("binderId");
  const { createPage } = useBinder();
  const [title, setTitle] = useState("");
  const [binderType, setBinderType] = useState<"free_layout" | "card_pocket">("free_layout");
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);

  // バインダーIDが必要
  useEffect(() => {
    if (!binderId) {
      navigate("/binder");
    }
  }, [binderId, navigate]);

  const handleCreate = async () => {
    if (!title.trim() || !user || !binderId) return;

    const layoutConfig = binderType === "card_pocket" ? { cols, rows } : {};
    
    const newPage = await createPage.mutateAsync({
      binderId,
      title,
      binderType,
      layoutConfig,
    });
    
    if (newPage) {
      navigate("/binder");
    }
  };

  if (!binderId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/binder")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>

        <Card className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">新しいページを作成</h1>
            <p className="text-muted-foreground">
              ページのタイプとレイアウトを選択してください
            </p>
          </div>

          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input
              placeholder="例: お気に入りコレクション"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <Label>ページタイプ</Label>
            <RadioGroup value={binderType} onValueChange={(v) => setBinderType(v as any)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`overflow-hidden cursor-pointer transition-all ${
                    binderType === "free_layout" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setBinderType("free_layout")}
                >
                  {/* Visual Preview */}
                  <div className="relative h-32 bg-gradient-to-br from-blue-50 to-purple-50 p-4">
                    <div className="absolute top-2 left-2 w-12 h-12 bg-white rounded shadow-md transform rotate-12" />
                    <div className="absolute top-6 right-4 w-16 h-10 bg-white rounded shadow-md transform -rotate-6" />
                    <div className="absolute bottom-4 left-6 w-14 h-14 bg-white rounded shadow-md transform rotate-3" />
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="free_layout" id="free_layout" />
                      <div className="flex-1">
                        <Label htmlFor="free_layout" className="cursor-pointer flex items-center gap-2">
                          <BookOpen className="w-5 h-5" />
                          <span className="font-semibold">フリーレイアウト</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          自由にグッズを配置して、独自のレイアウトを作成できます。
                          ドラッグ＆ドロップでサイズや角度も調整可能。
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card
                  className={`overflow-hidden cursor-pointer transition-all ${
                    binderType === "card_pocket" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setBinderType("card_pocket")}
                >
                  {/* Visual Preview */}
                  <div className="relative h-32 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                    <div className="grid grid-cols-3 gap-2 h-full">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="bg-white rounded shadow-sm" />
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="card_pocket" id="card_pocket" />
                      <div className="flex-1">
                        <Label htmlFor="card_pocket" className="cursor-pointer flex items-center gap-2">
                          <Grid3x3 className="w-5 h-5" />
                          <span className="font-semibold">カードポケット型</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          トレーディングカードのような、整然としたグリッドレイアウト。
                          カード収集に最適。
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </RadioGroup>
          </div>

          {binderType === "card_pocket" && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">ポケット設定</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>列数: {cols}</Label>
                  <input
                    type="range"
                    min="2"
                    max="5"
                    value={cols}
                    onChange={(e) => setCols(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>行数: {rows}</Label>
                  <input
                    type="range"
                    min="2"
                    max="5"
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                合計 {cols * rows} 個のポケット
              </div>
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="w-full"
            size="lg"
          >
            ページを作成
          </Button>
        </Card>
      </div>
    </div>
  );
}
