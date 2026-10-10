import { LegalDocPage } from "@/components/legal/LegalDocPage";
import { PRIVACY } from "@/content/legal";

/** プライバシーポリシー。本文は src/content/legal.ts */
export default function Privacy() {
  return <LegalDocPage docs={PRIVACY} />;
}
