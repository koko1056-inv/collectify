import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * プライバシーポリシー（プレースホルダー）。
 * Footer リンクから到達する公開ページ。本番運用時は法務確認の上、
 * 内容をプロダクトの実態に合わせて更新してください。
 */
export default function Privacy() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> {t("screens.privacy.back")}
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          {t("screens.privacy.title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-12">{t("screens.privacy.lastUpdated")}</p>

        <div className="prose prose-zinc max-w-none space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec1Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.privacy.sec1Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec2Title")}</h2>
            <ul className="list-disc pl-6 space-y-1 text-foreground/80">
              <li>{t("screens.privacy.sec2Item1")}</li>
              <li>{t("screens.privacy.sec2Item2")}</li>
              <li>{t("screens.privacy.sec2Item3")}</li>
              <li>{t("screens.privacy.sec2Item4")}</li>
              <li>{t("screens.privacy.sec2Item5")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec3Title")}</h2>
            <ul className="list-disc pl-6 space-y-1 text-foreground/80">
              <li>{t("screens.privacy.sec3Item1")}</li>
              <li>{t("screens.privacy.sec3Item2")}</li>
              <li>{t("screens.privacy.sec3Item3")}</li>
              <li>{t("screens.privacy.sec3Item4")}</li>
              <li>{t("screens.privacy.sec3Item5")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec4Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.privacy.sec4Body")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-foreground/80">
              <li>{t("screens.privacy.sec4Item1")}</li>
              <li>{t("screens.privacy.sec4Item2")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec5Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.privacy.sec5Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec6Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.privacy.sec6Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec7Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.privacy.sec7Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec8Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.privacy.sec8Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.privacy.sec9Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.privacy.sec9Body")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
