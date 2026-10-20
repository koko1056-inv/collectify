import { supabase } from "@/integrations/supabase/client";
import type { SecretQuestionId } from "@/config/secretQuestions";

/** react-query のキー。設定/変更（設定画面）とバナー（コレクション画面）の両方で使う。 */
export const SECRET_QUESTION_STATUS_QUERY_KEY = "my-secret-question-status";

export interface SecretQuestionStatus {
  hasQuestion: boolean;
  questionId: SecretQuestionId | null;
}

/** 自分の秘密の質問の設定状況（ハッシュは返らない）。 */
export async function fetchMySecretQuestionStatus(): Promise<SecretQuestionStatus> {
  const { data, error } = await supabase.rpc("get_my_secret_question_status");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    hasQuestion: !!row?.has_question,
    questionId: (row?.question_id as SecretQuestionId | null) ?? null,
  };
}

/**
 * 自分の秘密の質問を設定・変更する。
 * 新規登録直後に呼ぶときは、失敗しても登録自体は成功扱いにし、呼び出し側で握りつぶす
 * （バナーで後からの再設定を促す）。
 */
export async function saveMySecretQuestion(questionId: SecretQuestionId, answer: string): Promise<void> {
  const { error } = await supabase.rpc("set_my_secret_question", { question_id: questionId, answer });
  if (error) throw error;
}
