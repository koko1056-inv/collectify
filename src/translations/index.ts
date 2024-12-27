import { jaTranslations } from './ja';
import { enTranslations } from './en';

export type Language = "ja" | "en";
export type TranslationKey = string;

export const translations = {
  ja: jaTranslations,
  en: enTranslations,
} as const;

export type TranslationType = typeof translations.ja;

export function getTranslation(language: Language, key: string): string {
  const keys = key.split('.');
  let current: any = translations[language];
  
  for (const k of keys) {
    if (current[k] === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    current = current[k];
  }
  
  return current;
}