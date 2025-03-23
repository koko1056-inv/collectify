
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [isAdding, setIsAdding] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [editingThemeName, setEditingThemeName] = useState("");

  const handleAddTheme = () => {
    if (newThemeName.trim()) {
      onAddTheme(newThemeName.trim());
      setNewThemeName("");
      setIsAdding(false);
    }
  };

  const handleEditStart = (themeName: string) => {
    setEditingTheme(themeName);
    setEditingThemeName(themeName);
  };

  const handleEditComplete = () => {
    if (editingTheme && editingThemeName.trim() && editingThemeName !== editingTheme) {
      onRenameTheme(editingTheme, editingThemeName.trim());
    }
    setEditingTheme(null);
    setEditingThemeName("");
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">テーマ</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsAdding(!isAdding)}
          className="h-8 px-2"
        >
          <Plus className="h-4 w-4" />
          <span className="ml-1">テーマを追加</span>
        </Button>
      </div>

      {isAdding && (
        <div className="flex gap-2 items-center">
          <Input
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder="新しいテーマ名"
            className="text-sm h-8"
            onKeyPress={(e) => e.key === "Enter" && handleAddTheme()}
          />
          <Button size="sm" onClick={handleAddTheme} className="h-8">追加</Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAdding(false)} 
            className="h-8"
          >
            キャンセル
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTheme === null ? "default" : "outline"}
          size="sm"
          onClick={() => onThemeChange(null)}
          className="h-8 px-3"
        >
          すべて
        </Button>
        
        {themes.map((theme) => (
          <div key={theme} className="relative">
            {editingTheme === theme ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editingThemeName}
                  onChange={(e) => setEditingThemeName(e.target.value)}
                  className="h-8 text-sm w-32"
                  autoFocus
                  onKeyPress={(e) => e.key === "Enter" && handleEditComplete()}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleEditComplete}
                  className="h-8 w-8"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Badge
                className={`
                  py-1.5 px-3 cursor-pointer flex items-center gap-1
                  ${activeTheme === theme ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
                `}
                onClick={() => onThemeChange(theme)}
              >
                {theme}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditStart(theme);
                  }}
                  className="h-4 w-4 ml-1 p-0"
                >
                  <Pencil size={10} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTheme(theme);
                  }}
                  className="h-4 w-4 ml-1 p-0"
                >
                  <X size={10} />
                </Button>
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
