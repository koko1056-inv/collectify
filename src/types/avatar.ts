export type AvatarGenerationResult = {
  imageUrl: string;
  /** ユーザーが入力した生成プロンプト（空の場合は内部で補完） */
  prompt: string;
};
