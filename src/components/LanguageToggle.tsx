import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex rounded-lg border border-border overflow-hidden">
        <Button
          variant={language === "ja" ? "default" : "ghost"}
          size="sm"
          className="rounded-none px-3 h-8"
          onClick={() => setLanguage("ja")}
        >
          日本語
        </Button>
        <Button
          variant={language === "en" ? "default" : "ghost"}
          size="sm"
          className="rounded-none px-3 h-8"
          onClick={() => setLanguage("en")}
        >
          English
        </Button>
      </div>
    </div>
  );
}
