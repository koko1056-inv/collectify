// UUIDを検証するための正規表現
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 文字列がUUIDの形式に合致するかどうかを検証します。
 */
export function isValidUUID(str: string): boolean {
  return uuidRegex.test(str);
}

// isUUID は isValidUUID のエイリアス（後方互換性のため）
export const isUUID = isValidUUID;
