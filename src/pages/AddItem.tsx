import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { BackButton } from "@/components/navigation/BackButton";
import { Package, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { IconTile } from "@/components/ui/icon-tile";

export default function AddItem() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="container mx-auto px-4 pt-6 pb-nav">
        <div className="max-w-2xl mx-auto">
          <BackButton className="mb-6" fallbackTo="/collection" />

          {/* タイトルセクション */}
          <div className="mb-6 text-center">
            {/* 以前はグラデーションの手作りの面。共通の IconTile にそろえる */}
            <IconTile tone="primary" size="lg" className="mb-4">
              <Package />
            </IconTile>
            <h1 className="text-2xl font-bold text-foreground mb-2">{t("screens.addItem.title")}</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {t("screens.addItem.descLine1")}
              <br />
              {t("screens.addItem.descLine2")}
            </p>
          </div>

          {/* フォーム */}
          <AdminItemForm />

          {/* ヒント */}
          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">{t("screens.addItem.tipsTitle")}</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• {t("screens.addItem.tip1")}</li>
                  <li>• {t("screens.addItem.tip2")}</li>
                  <li>• {t("screens.addItem.tip3")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
