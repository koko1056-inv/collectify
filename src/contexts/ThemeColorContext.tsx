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
 *
 * swatch はそのテーマの primary（index.css の [data-theme-color] と同じ値。ライト / ダークそれぞれ）。
 * 以前は 🌹💙💚💜🧡 の絵文字で色を表していて、端末ごとに絵柄が違い、実際の色とも合っていなかった。
 * 設定画面では、この色で塗った小さな丸を見本として出す。
 */
export const themeColors: { value: ThemeColor; swatch: { light: string; dark: string } }[] = [
  { value: "rose", swatch: { light: "hsl(350 65% 48%)", dark: "hsl(350 75% 68%)" } },
  { value: "blue", swatch: { light: "hsl(212 80% 45%)", dark: "hsl(210 80% 66%)" } },
  { value: "green", swatch: { light: "hsl(152 62% 32%)", dark: "hsl(150 55% 55%)" } },
  { value: "purple", swatch: { light: "hsl(270 60% 55%)", dark: "hsl(270 70% 74%)" } },
  { value: "orange", swatch: { light: "hsl(22 90% 40%)", dark: "hsl(25 90% 62%)" } },
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
