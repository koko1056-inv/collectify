import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // デザインのトークン以外の文字サイズ・状態色を増やさないための警告（管理画面は除く）。
    // 文字は text-3xs / text-2xs / text-xs…、状態色は success / warning / info / points / destructive を使う。
    files: ["src/**/*.tsx"],
    ignores: ["src/components/admin/**", "src/components/admin-item-form/**", "src/pages/Admin.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/\\btext-\\[\\d+px\\]/]",
          message: "text-[Npx] ではなく text-3xs / text-2xs / text-xs などの段階を使ってください。",
        },
        {
          selector: "Literal[value=/\\b(text|bg|border)-(red|green|emerald|amber|yellow|blue|sky)-\\d{2,3}\\b/]",
          message: "状態の色は success / warning / info / points / destructive のトークンを使ってください（装飾の色は eslint-disable で理由を書く）。",
        },
      ],
    },
  }
);
