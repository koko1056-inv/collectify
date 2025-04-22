
import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark" | "purple" | "green" | "blue";
const themes: { [key in Theme]: { label: string; className: string } } = {
  light: { label: "ライト", className: "theme-light" },
  dark: { label: "ダーク", className: "theme-dark" },
  purple: { label: "パープル", className: "theme-purple" },
  green: { label: "グリーン", className: "theme-green" },
  blue: { label: "ブルー", className: "theme-blue" },
};

interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeOptions: { key: Theme; label: string }[];
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  setTheme: () => {},
  themeOptions: Object.entries(themes).map(([key, t]) => ({
    key: key as Theme,
    label: t.label,
  })),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("app-theme") as Theme | null;
    if (stored && themes[stored]) {
      setTheme(stored);
      applyClass(stored);
    } else {
      applyClass(theme);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    applyClass(theme);
  }, [theme]);

  const applyClass = (theme: Theme) => {
    document.body.classList.remove(
      ...Object.values(themes).map((t) => t.className)
    );
    document.body.classList.add(themes[theme].className);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themeOptions: Object.entries(themes).map(([key, t]) => ({
          key: key as Theme,
          label: t.label,
        })),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
