import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LEGAL_OPERATOR } from "@/config/legal";
import type { LegalDoc, LegalLang } from "@/content/legal";
import { LegalLinks } from "./LegalLinks";

interface LegalDocPageProps {
  docs: Record<LegalLang, LegalDoc>;
}

/** 法務ページ共通の見た目（見出し・前文・各条・表） */
export function LegalDocPage({ docs }: LegalDocPageProps) {
  const { t, language } = useLanguage();
  const doc = docs[language === "en" ? "en" : "ja"];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> {t("chrome.legal.back")}
        </Link>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3 text-balance">{doc.title}</h1>
        <p className="text-sm text-muted-foreground mb-10">
          {t("chrome.legal.updated", { date: LEGAL_OPERATOR.updatedAt })}
        </p>

        {doc.intro?.map((p, i) => (
          <p key={i} className="mb-8 leading-relaxed text-foreground/80">
            {p}
          </p>
        ))}

        <div className="space-y-9 leading-relaxed">
          {doc.sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg sm:text-xl font-bold mb-3">{s.title}</h2>
              {s.paragraphs?.map((p, i) => (
                <p key={i} className="mb-3 text-foreground/80">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="list-disc pl-6 space-y-1.5 text-foreground/80">
                  {s.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              {s.table && (
                <div className="overflow-x-auto rounded-xl border">
                  <table className={s.table.head.length > 2 ? "w-full min-w-[28rem] text-sm" : "w-full text-sm"}>
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h} className="px-3 py-2 font-bold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {s.table.rows.map((row, i) => (
                        <tr key={i} className="align-top">
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={
                                j === 0
                                  ? "w-24 px-3 py-2 font-medium sm:w-44"
                                  : "px-3 py-2 text-foreground/80 [overflow-wrap:anywhere]"
                              }
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <LegalLinks className="mt-14 border-t pt-6" />
      </div>
    </div>
  );
}
