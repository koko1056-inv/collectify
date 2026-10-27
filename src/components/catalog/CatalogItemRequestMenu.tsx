import { useState } from "react";
import { ClipboardList, CopyX, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { CatalogItemRequestKind } from "@/utils/catalogItemRequests";
import { CatalogItemRequestSheet } from "./CatalogItemRequestSheet";
import { MyCatalogItemRequestsSheet } from "./MyCatalogItemRequestsSheet";

interface CatalogItemRequestMenuProps {
  itemId: string;
  itemTitle?: string;
  itemImage?: string | null;
  className?: string;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
}

/**
 * カタログのグッズの「…」メニュー。修正申請・重複を報告・削除申請と、自分の申請の状況を開く。
 * 未ログインでも出す（押すとシートの中で登録をすすめる）。
 * 親がクリックで開くカードでも使えるよう、中のクリックは外に伝えない。
 */
export function CatalogItemRequestMenu({
  itemId,
  itemTitle,
  itemImage,
  className,
  triggerClassName,
  align = "end",
}: CatalogItemRequestMenuProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [kind, setKind] = useState<CatalogItemRequestKind | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  const open = (k: CatalogItemRequestKind) => setKind(k);

  return (
    <span
      className={cn("inline-flex", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("catalogItemRequest.menu.aria")}
            className={cn("h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground", triggerClassName)}
            data-testid="catalog-item-request-menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-[11rem]">
          <DropdownMenuItem onSelect={() => open("edit")}>
            <PencilLine className="mr-2 h-4 w-4" />
            {t("catalogItemRequest.menu.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => open("duplicate")}>
            <CopyX className="mr-2 h-4 w-4" />
            {t("catalogItemRequest.menu.duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => open("delete")} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {t("catalogItemRequest.menu.delete")}
          </DropdownMenuItem>
          {user && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setStatusOpen(true)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                {t("catalogItemRequest.menu.status")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogItemRequestSheet
        open={kind !== null}
        onOpenChange={(o) => {
          if (!o) setKind(null);
        }}
        initialKind={kind ?? "edit"}
        itemId={itemId}
        itemTitle={itemTitle}
        itemImage={itemImage}
      />
      {user && <MyCatalogItemRequestsSheet open={statusOpen} onOpenChange={setStatusOpen} />}
    </span>
  );
}
