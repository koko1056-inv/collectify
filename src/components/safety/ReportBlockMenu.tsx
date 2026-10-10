import { useState } from "react";
import { Ban, Flag, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlockUser } from "@/hooks/useBlocks";
import { cn } from "@/lib/utils";
import { ReportDialog, type ReportTargetType } from "./ReportDialog";

interface ReportBlockMenuProps {
  targetType: ReportTargetType;
  /** 通報する対象の id（user / profile の場合はユーザーの id） */
  targetId: string;
  /** 対象の持ち主。自分自身なら何も出さない */
  ownerId: string | null | undefined;
  ownerName?: string | null;
  /** ブロック項目を出すか（DM のメッセージ単位など、ユーザー単位の操作が不要なとき false） */
  allowBlock?: boolean;
  /** 通報項目を出すか */
  allowReport?: boolean;
  className?: string;
  /** トリガーボタンの見た目 */
  triggerClassName?: string;
  /** メニューを開く側（既定は右下に寄せる） */
  align?: "start" | "center" | "end";
  /** 明るい背景の上にないとき（画像の上など）は暗い丸ボタンにする */
  tone?: "default" | "overlay";
}

/**
 * 「通報する」「このユーザーをブロック」を出す小さな「…」メニュー。
 * 自分の投稿・コメントには出さない。ログインしていない場合も出さない。
 *
 * 親がクリックで画面遷移するカードでも使えるよう、中のクリックは外に伝えない。
 */
export function ReportBlockMenu({
  targetType,
  targetId,
  ownerId,
  ownerName,
  allowBlock = true,
  allowReport = true,
  className,
  triggerClassName,
  align = "end",
  tone = "default",
}: ReportBlockMenuProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const blockUser = useBlockUser();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  if (!user || !ownerId || ownerId === user.id) return null;
  if (!allowBlock && !allowReport) return null;

  const displayName = ownerName || t("safety.blocked.anonymous");

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
            aria-label={t("safety.menu.more")}
            className={cn(
              "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
              tone === "overlay" && "rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white",
              triggerClassName
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          {allowReport && (
            <DropdownMenuItem onSelect={() => setReportOpen(true)}>
              <Flag className="mr-2 h-4 w-4" />
              {t("safety.menu.report")}
            </DropdownMenuItem>
          )}
          {allowReport && allowBlock && <DropdownMenuSeparator />}
          {allowBlock && (
            <DropdownMenuItem
              onSelect={() => setBlockOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="mr-2 h-4 w-4" />
              {t("safety.menu.block")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {allowReport && (
        <ReportDialog
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType={targetType}
          targetId={targetId}
          ownerId={allowBlock ? ownerId : null}
          ownerName={ownerName}
        />
      )}

      {allowBlock && (
        <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("safety.menu.blockConfirmTitle", { name: displayName })}</AlertDialogTitle>
              <AlertDialogDescription>{t("safety.menu.blockConfirmDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("safety.menu.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => blockUser.mutate({ userId: ownerId, name: displayName })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("safety.menu.blockConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </span>
  );
}
