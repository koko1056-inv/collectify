import { LegalDocPage } from "@/components/legal/LegalDocPage";
import { TOKUSHOHO } from "@/content/legal";

/** 特定商取引法に基づく表記。本文は src/content/legal.ts、事業者の情報は src/config/legal.ts */
export default function Tokushoho() {
  return <LegalDocPage docs={TOKUSHOHO} />;
}
