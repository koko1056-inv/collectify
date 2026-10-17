import { Album, BookOpen, LayoutGrid, Library, Orbit, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { CollectionDisplay } from "./collectionDisplay";

const OPTIONS: { value: CollectionDisplay; icon: LucideIcon }[] = [
  { value: "grid", icon: LayoutGrid },
  { value: "zukan", icon: BookOpen },
  { value: "binder", icon: Album },
  { value: "shelf", icon: Library },
];

/** ツールバーの「並べ方」。グリッド・図鑑・バインダー・飾り棚と、全画面で開く推し宇宙 */
export function CollectionDisplayMenu({
  display,
  onChange,
  onOpenUniverse,
}: {
  display: CollectionDisplay;
  onChange: (d: CollectionDisplay) => void;
  /** 渡したときだけ、推し宇宙をメニューに出す（自分のコレクションだけ） */
  onOpenUniverse?: () => void;
}) {
  const { t } = useLanguage();
  const Current = OPTIONS.find((o) => o.value === display)?.icon ?? LayoutGrid;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "tap-safe-y h-9 w-9 rounded-lg text-foreground hover:bg-muted/60",
            display !== "grid" && "bg-primary/10 text-primary hover:bg-primary/15"
          )}
          title={t("collectionScreen.display.label")}
          aria-label={`${t("collectionScreen.display.label")}: ${t(`collectionScreen.display.${display}`)}`}
          data-tour="collection-display"
        >
          <Current className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("collectionScreen.display.label")}
        </DropdownMenuLabel>
        {OPTIONS.map(({ value, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onChange(value)}
            className={cn("gap-3 py-2", display === value && "bg-accent")}
          >
            <Icon className={cn("h-4 w-4 shrink-0", display === value ? "text-primary" : "text-muted-foreground")} />
            <span className="flex flex-col">
              <span className={cn("text-sm", display === value && "font-bold")}>
                {t(`collectionScreen.display.${value}`)}
              </span>
              <span className="text-xs text-muted-foreground">{t(`collectionScreen.display.${value}Desc`)}</span>
            </span>
          </DropdownMenuItem>
        ))}
        {onOpenUniverse && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenUniverse} className="gap-3 py-2">
              <Orbit className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex flex-col">
                <span className="text-sm">{t("collectionScreen.display.universe")}</span>
                <span className="text-xs text-muted-foreground">{t("collectionScreen.display.universeDesc")}</span>
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
