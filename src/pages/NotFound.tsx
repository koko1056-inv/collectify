import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * 存在しない URL。以前は何も言わずに /collection へ飛ばしていたので、
 * 壊れたリンクを踏んでも「押したのに何も起きない」ように見えていた。
 */
export default function NotFound() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) console.warn(`[NotFound] ルートがありません: ${pathname}`);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-nav pt-6">
        <EmptyState
          icon={Compass}
          title={t("screens.notFound.title")}
          description={t("screens.notFound.desc")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {window.history.length > 1 && (
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  {t("screens.notFound.back")}
                </Button>
              )}
              <Button onClick={() => navigate("/collection")}>{t("screens.notFound.home")}</Button>
            </div>
          }
        />
      </main>
      <Footer />
    </div>
  );
}
