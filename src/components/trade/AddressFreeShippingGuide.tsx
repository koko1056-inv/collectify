import { Hand, MapPin, ShieldCheck, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * 住所を伝えずに送り合う方法の案内。
 *
 * このアプリは住所・氏名を預からない。預かると個人情報の安全管理の責任が生まれるうえ、
 * 交換の相手に住所を渡すこと自体が、慣れない人には心理的な壁になる。
 * そのため、アプリは「方法を案内する」だけにして、住所のやり取りを発生させない。
 */
export function AddressFreeShippingGuide() {
  const { t } = useLanguage();

  const methods = [
    { icon: Smartphone, key: "m1" },
    { icon: MapPin, key: "m2" },
    { icon: Hand, key: "m3" },
  ] as const;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-primary">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {t("trade.addressless.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("trade.addressless.title")}</DialogTitle>
          <DialogDescription>{t("trade.addressless.intro")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {methods.map(({ icon: Icon, key }) => (
            <section key={key} className="space-y-1.5 rounded-lg border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {t(`trade.addressless.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-foreground/90">
                {t(`trade.addressless.${key}.body`)}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t(`trade.addressless.${key}.note`)}
              </p>
            </section>
          ))}

          <section className="rounded-lg bg-muted/60 p-3">
            <h3 className="mb-1.5 text-sm font-bold">{t("trade.addressless.safetyTitle")}</h3>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
              <li>{t("trade.addressless.safety1")}</li>
              <li>{t("trade.addressless.safety2")}</li>
              <li>{t("trade.addressless.safety3")}</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
