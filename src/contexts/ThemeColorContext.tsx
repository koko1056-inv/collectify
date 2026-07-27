import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeColor = "rose" | "blue" | "green" | "purple" | "orange";

interface ThemeColorContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

const THEME_COLOR_KEY = "collectify-theme-color";

/**
 * テーマカラーの選択肢。
 * 表示名は言語で変わるため、ここには持たせず `chrome.themeColor.<value>` を
 * 描画側で t() で引く（value が翻訳キーの末尾になる）。
 */
export const themeColors: { value: ThemeColor; emoji: string }[] = [
  { value: "rose", emoji: "🌹" },
  { value: "blue", emoji: "💙" },
  { value: "green", emoji: "💚" },
  { value: "purple", emoji: "💜" },
  { value: "orange", emoji: "🧡" },
];

export function ThemeColorProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem(THEME_COLOR_KEY);
    return (saved as ThemeColor) || "rose";
  });

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem(THEME_COLOR_KEY, color);
  };

  useEffect(() => {
    // テーマカラーをHTML要素に適用
    document.documentElement.setAttribute("data-theme-color", themeColor);
  }, [themeColor]);

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (!context) {
    throw new Error("useThemeColor must be used within a ThemeColorProvider");
  }
  return context;
}
