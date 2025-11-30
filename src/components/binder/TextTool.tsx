import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useBinder } from "@/hooks/useBinder";
import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextToolProps {
  pageId: string;
}

export function TextTool({ pageId }: TextToolProps) {
  const { addDecoration } = useBinder();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("bold");
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">("normal");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [textShadow, setTextShadow] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeColor, setStrokeColor] = useState("#ffffff");

  const handleAddText = async () => {
    if (!text.trim()) {
      toast({
        title: "エラー",
        description: "テキストを入力してください",
        variant: "destructive",
      });
      return;
    }

    const shadowStyle = textShadow ? "2px 2px 4px rgba(0,0,0,0.3)" : "none";
    const strokeStyle = strokeWidth > 0 
      ? `-${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}, ${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}, -${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}, ${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`
      : "none";

    await addDecoration.mutateAsync({
      binder_page_id: pageId,
      decoration_type: "text",
      content: text,
      position_x: 150,
      position_y: 150,
      width: null,
      height: null,
      rotation: 0,
      z_index: 100,
      style_config: {
        fontSize: `${fontSize}px`,
        color,
        fontFamily,
        fontWeight,
        fontStyle,
        textAlign,
        textShadow: shadowStyle,
        textStroke: strokeStyle,
      },
    });

    toast({
      title: "テキストを追加しました",
    });
    setText("");
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Type className="w-5 h-5" />
        テキストを追加
      </h3>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">基本</TabsTrigger>
          <TabsTrigger value="style">スタイル</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="space-y-2">
            <Label>テキスト</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="テキストを入力..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>フォントサイズ: {fontSize}px</Label>
            <Slider
              value={[fontSize]}
              onValueChange={(value) => setFontSize(value[0])}
              min={12}
              max={120}
              step={2}
            />
          </div>

          <div className="space-y-2">
            <Label>フォント</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sans-serif">ゴシック</SelectItem>
                <SelectItem value="serif">明朝</SelectItem>
                <SelectItem value="monospace">等幅</SelectItem>
                <SelectItem value="cursive">手書き風</SelectItem>
                <SelectItem value="fantasy">装飾的</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>カラー</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          <div className="space-y-2">
            <Label>テキスト装飾</Label>
            <div className="flex gap-2">
              <Button
                variant={fontWeight === "bold" ? "default" : "outline"}
                size="icon"
                onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant={fontStyle === "italic" ? "default" : "outline"}
                size="icon"
                onClick={() => setFontStyle(fontStyle === "italic" ? "normal" : "italic")}
              >
                <Italic className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>テキスト配置</Label>
            <div className="flex gap-2">
              <Button
                variant={textAlign === "left" ? "default" : "outline"}
                size="icon"
                onClick={() => setTextAlign("left")}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={textAlign === "center" ? "default" : "outline"}
                size="icon"
                onClick={() => setTextAlign("center")}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant={textAlign === "right" ? "default" : "outline"}
                size="icon"
                onClick={() => setTextAlign("right")}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="textShadow"
                checked={textShadow}
                onChange={(e) => setTextShadow(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="textShadow">テキストシャドウ</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>縁取り: {strokeWidth}px</Label>
            <Slider
              value={[strokeWidth]}
              onValueChange={(value) => setStrokeWidth(value[0])}
              min={0}
              max={8}
              step={1}
            />
            {strokeWidth > 0 && (
              <div className="flex gap-2 mt-2">
                <Label className="text-xs">縁取り色:</Label>
                <Input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-16 h-6"
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleAddText} className="w-full" disabled={!text.trim()}>
        <Type className="w-4 h-4 mr-2" />
        テキストを追加
      </Button>
    </div>
  );
}
