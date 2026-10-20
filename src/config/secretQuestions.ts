/**
 * 秘密の質問の固定リスト。
 *
 * ID は supabase/migrations/20261020200000_secret_question_reset.sql の
 * user_secret_questions.question_id の CHECK 制約と揃えること（増減したら両方直す）。
 * 質問文そのものは翻訳ファイル（src/translations/modules/chrome.ts の
 * secretQuestion.questions.<id>）に ja/en を用意する。
 */
export const SECRET_QUESTION_IDS = [
  "first_oshi",
  "first_goods",
  "childhood_nickname",
  "live_venue",
  "first_anime",
  "school_name",
  "pet_name",
] as const;

export type SecretQuestionId = (typeof SECRET_QUESTION_IDS)[number];

export function isSecretQuestionId(value: string | null | undefined): value is SecretQuestionId {
  return !!value && (SECRET_QUESTION_IDS as readonly string[]).includes(value);
}
