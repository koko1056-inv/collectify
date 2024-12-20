import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface TagInputFieldProps {
  onAddTag: (tagName: string) => Promise<void>;
}

export function TagInputField({ onAddTag }: TagInputFieldProps) {
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      try {
        await onAddTag(tagInput.trim().toLowerCase());
        setTagInput("");
      } catch (error) {
        console.error("Error adding tag:", error);
        toast({
          title: "エラー",
          description: "タグの追加に失敗しました。",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Input
      placeholder="新しいタグを入力してEnterを押してください"
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}