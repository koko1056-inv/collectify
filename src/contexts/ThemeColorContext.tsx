import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeColor = "rose" | "blue" | "green" | "purple" | "orange";

interface ThemeColorContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

const THEME_COLOR_KEY = "collectify-theme-color";

export const themeColors: { value: ThemeColor; label: string; emoji: string }[] = [
  { value: "rose", label: "ローズ", emoji: "🌹" },
  { value: "blue", label: "ブルー", emoji: "💙" },
  { value: "green", label: "グリーン", emoji: "💚" },
  { value: "purple", label: "パープル", emoji: "💜" },
  { value: "orange", label: "オレンジ", emoji: "🧡" },
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
