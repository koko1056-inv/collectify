import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { SECRET_QUESTION_STATUS_QUERY_KEY, saveMySecretQuestion } from "@/utils/secretQuestion";
import { normalizeSecretAnswer } from "@/utils/secretAnswerNormalize";
import { SECRET_QUESTION_IDS, type SecretQuestionId } from "@/config/secretQuestions";

interface SecretQuestionFormProps {
  /** 設定画面のダイアログ・コレクション画面のバナーの両方から使うフォーム本体 */
  onSaved: () => void;
}

/** 質問の選択＋答えの入力＋保存。設定画面（変更時は本人確認の後）とバナーの両方で使う。 */
export function SecretQuestionForm({ onSaved }: SecretQuestionFormProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [questionId, setQuestionId] = useState<SecretQuestionId | "">("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = !!questionId && normalizeSecretAnswer(answer).length >= 2 && !saving;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !questionId) return;
    setSaving(true);
    try {
      await saveMySecretQuestion(questionId, answer);
      toast.success(t("chrome.secretQuestion.savedTitle"));
      queryClient.invalidateQueries({ queryKey: [SECRET_QUESTION_STATUS_QUERY_KEY, user?.id] });
      onSaved();
    } catch (err) {
      console.error("Failed to save secret question:", err);
      toast.error(t("profileScreen.common.error"), { description: t("chrome.secretQuestion.saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("chrome.secretQuestion.selectLabel")}</Label>
        <Select value={questionId} onValueChange={(v) => setQuestionId(v as SecretQuestionId)}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder={t("chrome.secretQuestion.selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {SECRET_QUESTION_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {t(`chrome.secretQuestion.questions.${id}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="secret-question-answer">{t("chrome.secretQuestion.answerLabel")}</Label>
        <Input
          id="secret-question-answer"
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t("chrome.secretQuestion.answerPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("chrome.secretQuestion.answerHint")}</p>
      </div>
      <Button type="submit" disabled={!canSave} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("chrome.secretQuestion.save")}
      </Button>
    </form>
  );
}
