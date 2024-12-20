import { LoginFormData } from "@/types/auth";

export const validateLoginForm = (formData: LoginFormData): string | null => {
  if (!formData.username || !formData.password) {
    return "ユーザー名とパスワードを入力してください";
  }
  if (formData.password.length < 6) {
    return "パスワードは6文字以上である必要があります";
  }
  return null;
};