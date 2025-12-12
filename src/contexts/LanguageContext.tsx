import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, TranslationKey, getTranslation } from "../translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = "app-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return (saved === "en" || saved === "ja") ? saved : "ja";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const t = (key: TranslationKey): string => {
    return getTranslation(language, key);
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
      t: (key: TranslationKey) => getTranslation("ja", key),
    } as LanguageContextType;
  }
  return context;
}
