// UUIDを検証するための正規表現
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 文字列がUUIDの形式に合致するかどうかを検証します。
 *
 * @param str 検証する文字列
 * @returns 文字列がUUIDの形式に合致する場合はtrue、そうでない場合はfalse
 */
export function isValidUUID(str: string): boolean {
  return uuidRegex.test(str);
}

// UUID検証関数を追加
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
