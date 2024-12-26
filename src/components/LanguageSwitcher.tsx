import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === "ja" ? "en" : "ja")}
      className="h-8 w-12 sm:h-9 sm:w-14"
    >
      {language.toUpperCase()}
    </Button>
  );
}