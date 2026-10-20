/**
 * 秘密の質問の答えを正規化する（クライアント側プレビュー用）。
 *
 * supabase/migrations/20261020200000_secret_question_reset.sql の
 * secret_answer_normalize() と同じアルゴリズムを保つこと。実際のハッシュ化・検証は
 * 常にサーバー（この SQL 関数）側で行うので、ここがずれても安全性は損なわれないが、
 * 「あと何文字」のような入力中のプレビューがサーバーの判定とずれてしまう。
 */
export function normalizeSecretAnswer(input: string): string {
  // (a)(b)(c) Unicode正規化（NFKC）で全角英数・半角カナなどの表記ゆれを吸収し、小文字化する
  let normalized = input.normalize("NFKC").toLowerCase();

  // (d) ひらがな（U+3041-3096）を1文字ずつカタカナ（U+30A1-30F6、+0x60）に変換する。
  //     長音符ー（U+30FC）・中点・（U+30FB）はこの範囲の外なので変換しない。
  normalized = Array.from(normalized)
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : ch;
    })
    .join("");

  // (e) 連続する空白を1つにまとめ、前後の空白を除く
  return normalized.replace(/\s+/g, " ").trim();
}
