import { LegalDocPage } from "@/components/legal/LegalDocPage";
import { TERMS } from "@/content/legal";

/** 利用規約。本文は src/content/legal.ts */
export default function Terms() {
  return <LegalDocPage docs={TERMS} />;
}
