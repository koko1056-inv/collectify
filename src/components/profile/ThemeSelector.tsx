
import { Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Label } from "@/components/ui/label";

export function ThemeSelector() {
  const { theme, setTheme, themeOptions } = useTheme();

  return (
    <div className="mb-6">
      <Label className="flex items-center text-lg font-semibold mb-2">
        <Palette className="mr-2" />
        カラーテーマ
      </Label>
      <div className="flex flex-wrap gap-3">
        {themeOptions.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            onClick={() => setTheme(key)}
            className={`px-4 py-2 rounded border-2 
              ${theme === key ? "border-primary" : "border-gray-300"} 
              transition shadow-sm bg-white hover:border-primary focus:outline-none`}
            aria-pressed={theme === key}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
