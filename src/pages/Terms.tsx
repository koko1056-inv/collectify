import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * 利用規約（プレースホルダー）。
 * Footer リンクから到達する公開ページ。本番運用時は法務確認の上、
 * 内容をプロダクトの実態に合わせて更新してください。
 */
export default function Terms() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <Link
          to="/lp"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> {t("screens.terms.back")}
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{t("screens.terms.title")}</h1>
        <p className="text-sm text-muted-foreground mb-12">{t("screens.terms.lastUpdated")}</p>

        <div className="prose prose-zinc max-w-none space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art1Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art1Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art2Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art2Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art3Title")}</h2>
            <ul className="list-disc pl-6 space-y-1 text-foreground/80">
              <li>{t("screens.terms.art3Item1")}</li>
              <li>{t("screens.terms.art3Item2")}</li>
              <li>{t("screens.terms.art3Item3")}</li>
              <li>{t("screens.terms.art3Item4")}</li>
              <li>{t("screens.terms.art3Item5")}</li>
              <li>{t("screens.terms.art3Item6")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art4Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art4Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art5Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art5Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art6Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art6Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art7Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art7Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art8Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art8Body")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t("screens.terms.art9Title")}</h2>
            <p className="text-foreground/80">
              {t("screens.terms.art9Body")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
