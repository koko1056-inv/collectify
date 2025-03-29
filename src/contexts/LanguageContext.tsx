
import React, { createContext, useContext, useState, ReactNode } from "react";
import { enTranslations } from "@/translations/en";
import { jaTranslations } from "@/translations/ja";

type Translations = typeof enTranslations;
type TranslationFunction = (key: string, fallback?: string) => string;

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: TranslationFunction;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ja",
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState("ja");

  const getTranslation = (key: string, fallback?: string): string => {
    const translations = language === "en" ? enTranslations : jaTranslations;
    
    // Handle nested keys like "nav.login"
    const keys = key.split(".");
    let result: any = translations;
    
    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = result[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof result === "string" ? result : fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: getTranslation,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
