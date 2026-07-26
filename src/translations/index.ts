import { jaTranslations } from './ja';
import { enTranslations } from './en';
import { moduleTranslations } from './modules';

export type Language = "ja" | "en";
export type TranslationKey = string;

type Dict = { [key: string]: string | Dict };

/**
 * 2つの辞書を再帰的にマージする（後勝ち）。
 * ベース辞書（ja.ts / en.ts）とエリア別モジュールを合成するために使う。
 */
function deepMerge(base: Dict, extra: Dict): Dict {
  const out: Dict = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const prev = out[key];
    if (
      typeof value === "object" && value !== null &&
      typeof prev === "object" && prev !== null
    ) {
      out[key] = deepMerge(prev as Dict, value as Dict);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export const translations = {
  ja: deepMerge(jaTranslations as unknown as Dict, moduleTranslations.ja),
  en: deepMerge(enTranslations as unknown as Dict, moduleTranslations.en),
};

export type TranslationType = typeof jaTranslations;

/** キーを辞書から引く。見つからなければ undefined。 */
function lookup(dict: Dict, key: string): string | undefined {
  let current: string | Dict | undefined = dict;
  for (const k of key.split('.')) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Dict)[k];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * 翻訳を取得する。
 *
 * 英語訳が未整備のキーは**日本語にフォールバック**する。
 * ここでキー文字列をそのまま返すと、移行途中の画面に "collection.add" のような
 * 生のキーが表示されてしまうため。日本語も無い場合だけ最後の手段としてキーを返す。
 */
export type TranslationVars = Record<string, string | number>;

/** "{name}" 形式のプレースホルダを埋める。 */
function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  );
}

export function getTranslation(
  language: Language,
  key: string,
  vars?: TranslationVars
): string {
  const primary = lookup(translations[language] as Dict, key);
  if (primary !== undefined) return interpolate(primary, vars);

  if (language !== "ja") {
    const ja = lookup(translations.ja as Dict, key);
    if (ja !== undefined) {
      if (import.meta.env?.DEV) {
        console.warn(`[i18n] missing ${language} translation, falling back to ja: ${key}`);
      }
      return interpolate(ja, vars);
    }
  }

  if (import.meta.env?.DEV) {
    console.warn(`[i18n] translation key not found: ${key}`);
  }
  return key;
}
