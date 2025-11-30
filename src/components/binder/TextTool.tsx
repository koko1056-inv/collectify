import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBinder } from "@/hooks/useBinder";
import { Palette } from "lucide-react";

interface TextToolProps {
  pageId: string;
}

export function TextTool({ pageId }: TextToolProps) {
  const { addDecoration } = useBinder();
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState("#000000");

  const handleAddText = async () => {
    if (!text.trim()) return;

    await addDecoration.mutateAsync({
      binder_page_id: pageId,
      decoration_type: "text",
      content: text,
      position_x: 100,
      position_y: 100,
      width: null,
      height: null,
      rotation: 0,
      z_index: 100,
      style_config: {
        fontSize: `${fontSize}px`,
        color,
        fontWeight: "bold",
      },
    });

    setText("");
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">テキストを追加</h3>

      <div className="space-y-2">
        <Label>テキスト</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="テキストを入力..."
        />
      </div>

      <div className="space-y-2">
        <Label>フォントサイズ: {fontSize}px</Label>
        <input
          type="range"
          min="12"
          max="72"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full"
        />
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => setColor("#000000")}
          >
            <Palette className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button onClick={handleAddText} className="w-full" disabled={!text.trim()}>
        テキストを追加
      </Button>
    </div>
  );
}
