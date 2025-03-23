
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ThemeAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  currentTheme: string | null;
  themes: string[];
  onAssignTheme: (theme: string | null) => void;
}

export function ThemeAssignDialog({
  isOpen,
  onClose,
  itemTitle,
  currentTheme,
  themes,
  onAssignTheme
}: ThemeAssignDialogProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(currentTheme);
  
  useEffect(() => {
    setSelectedTheme(currentTheme);
  }, [currentTheme, isOpen]);

  const handleAssign = () => {
    onAssignTheme(selectedTheme);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>テーマを選択</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">
            「{itemTitle}」のテーマを選択してください
          </p>
          <div className="space-y-2">
            <Label htmlFor="theme-select">テーマ</Label>
            <Select 
              value={selectedTheme || ""} 
              onValueChange={(value) => setSelectedTheme(value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="テーマを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">テーマなし</SelectItem>
                {themes.map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {theme}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button onClick={handleAssign}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
