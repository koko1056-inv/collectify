
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ThemeSelectorProps {
  themes: string[];
  activeTheme: string | null;
  onThemeChange: (theme: string | null) => void;
  onAddTheme: (theme: string) => void;
  onRemoveTheme: (theme: string) => void;
  onRenameTheme: (oldName: string, newName: string) => void;
}

export function ThemeSelector({ 
  themes, 
  activeTheme, 
  onThemeChange, 
  onAddTheme, 
  onRemoveTheme,
  onRenameTheme
}: ThemeSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [editingTheme, setEditingTheme] = useState<{ original: string, new: string } | null>(null);

  const handleAddTheme = () => {
    if (newThemeName.trim()) {
      onAddTheme(newThemeName.trim());
      setNewThemeName("");
      setIsDialogOpen(false);
    }
  };

  const handleEditTheme = () => {
    if (editingTheme && editingTheme.new.trim() && editingTheme.original !== editingTheme.new) {
      onRenameTheme(editingTheme.original, editingTheme.new);
      setEditingTheme(null);
    }
  };

  const startEditTheme = (theme: string) => {
    setEditingTheme({ original: theme, new: theme });
  };

  const cancelEditTheme = () => {
    setEditingTheme(null);
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge 
          className={`cursor-pointer px-3 py-1 ${activeTheme === null ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
          onClick={() => onThemeChange(null)}
        >
          すべて
        </Badge>
        
        {themes.map((theme) => (
          <div key={theme} className="flex items-center">
            {editingTheme && editingTheme.original === theme ? (
              <div className="flex items-center bg-white border rounded-full overflow-hidden">
                <Input 
                  value={editingTheme.new}
                  onChange={(e) => setEditingTheme({ ...editingTheme, new: e.target.value })}
                  className="border-0 h-7 rounded-none focus-visible:ring-0 px-2"
                  autoFocus
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleEditTheme}
                  className="h-7 w-7 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={cancelEditTheme}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <Badge 
                  className={`cursor-pointer px-3 py-1 ${activeTheme === theme ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
                  onClick={() => onThemeChange(theme)}
                >
                  {theme}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => startEditTheme(theme)}
                  className="h-6 w-6 ml-1"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onRemoveTheme(theme)}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsDialogOpen(true)}
          className="rounded-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          新しいテーマ
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新しいテーマを追加</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="テーマ名を入力"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={handleAddTheme}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
