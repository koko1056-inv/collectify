import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/** ライト固定 / ダーク固定 / 端末の設定に追従 */
export type ColorScheme = "light" | "dark" | "system";

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  /** 実際に適用されている見た目（system を解決した結果） */
  resolved: "light" | "dark";
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

const STORAGE_KEY = "collectify-color-scheme";

function readStored(): ColorScheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    /* localStorage が使えない環境 */
  }
  return "light";
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * ダークモードの適用。index.css の `.dark` トークンを有効にする。
 *
 * ダーク用のトークンは以前から定義されていたが、`dark` クラスを付与する処理が
 * どこにも無かったため到達できないままだった。ここで初めて機能する。
 */
export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(readStored);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  // 端末設定の変化に追従（scheme が "system" のときだけ意味を持つ）
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    colorScheme === "system" ? (systemDark ? "dark" : "light") : colorScheme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    // モバイルのアドレスバー/ステータスバーの色も合わせる
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#14121a" : "#ffffff");
  }, [resolved]);

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    try {
      localStorage.setItem(STORAGE_KEY, scheme);
    } catch {
      /* 保存できなくても表示は切り替える */
    }
  };

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme, resolved }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorSchemeContextType {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    // Provider の外で呼ばれても落とさない（ライト固定で振る舞う）
    return { colorScheme: "light", setColorScheme: () => {}, resolved: "light" };
  }
  return context;
}
