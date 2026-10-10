import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, TranslationKey, TranslationVars, getTranslation } from "../translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /**
   * 翻訳を引く。第2引数で "{n}件" のようなプレースホルダを埋められる。
   * 語順が言語で変わるため、文を prefix/suffix に割らずこちらを使うこと。
   */
  t: (key: TranslationKey, vars?: TranslationVars) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = "app-language";

/**
 * 最初の言語。保存した選択があればそれ、なければブラウザの言語（日本語なら日本語、それ以外は英語）。
 * ストレージが使えない環境でも落ちないようにする。
 */
function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === "en" || saved === "ja") return saved;
  } catch {
    // ストレージが使えないときはブラウザの言語で決める
  }
  const preferred = typeof navigator !== "undefined" ? navigator.languages?.[0] ?? navigator.language : "";
  return preferred && !preferred.toLowerCase().startsWith("ja") ? "en" : "ja";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return detectInitialLanguage();
  });

  // 画面の言語をブラウザ・読み上げ・翻訳機能にも伝える
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // 保存できなくても、この画面の言語は切り替わる
    }
  };

  const t = (key: TranslationKey, vars?: TranslationVars): string => {
    return getTranslation(language, key, vars);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    if (typeof window !== "undefined") {
      console.warn(
        "useLanguage used without a LanguageProvider. Falling back to default language 'ja'."
      );
    }
    return {
      language: "ja",
      setLanguage: () => {},
      t: (key: TranslationKey, vars?: TranslationVars) => getTranslation("ja", key, vars),
    } as LanguageContextType;
  }
  return context;
}
