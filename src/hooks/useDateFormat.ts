import { useMemo } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ja, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    // ISO 文字列は parseISO の方がタイムゾーンの扱いが素直
    const parsed = parseISO(value);
    return isNaN(parsed.getTime()) ? new Date(value) : parsed;
  }
  return new Date(value);
}

/**
 * 表示言語に追従する日付フォーマット。
 *
 * これが無いと `format(d, "yyyy年M月d日", { locale: ja })` のように
 * 書式とロケールがコード中に固定され、英語表示でも日本語の日付が出てしまう。
 * 画面側は書式を意識せず、用途で選ぶ。
 */
export function useDateFormat() {
  const { language } = useLanguage();

  return useMemo(() => {
    const isEn = language === "en";
    const locale = isEn ? enUS : ja;

    return {
      locale,

      /** 2026年5月1日 / May 1, 2026 */
      formatDate: (value: DateInput) =>
        format(toDate(value), isEn ? "MMM d, yyyy" : "yyyy年M月d日", { locale }),

      /** 5/1 （数字表記なので言語差なし） */
      formatShortDate: (value: DateInput) =>
        format(toDate(value), "M/d", { locale }),

      /** 5/1 12:34 */
      formatShortDateTime: (value: DateInput) =>
        format(toDate(value), "M/d HH:mm", { locale }),

      /** 05/01 12:34 */
      formatPaddedDateTime: (value: DateInput) =>
        format(toDate(value), "MM/dd HH:mm", { locale }),

      /** 3日前 / 3 days ago */
      formatRelative: (value: DateInput) =>
        formatDistanceToNow(toDate(value), { addSuffix: true, locale }),

      /** 3日 / 3 days （「後」「前」を付けない残り時間などに） */
      formatDistance: (value: DateInput) =>
        formatDistanceToNow(toDate(value), { locale }),

      /** date-fns の任意の書式を使いたい場合の逃げ道 */
      formatWith: (value: DateInput, pattern: string) =>
        format(toDate(value), pattern, { locale }),
    };
  }, [language]);
}
