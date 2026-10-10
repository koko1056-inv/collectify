import { useEffect, useState } from "react";
import { Check, Loader2, Send, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  useMyFeedback,
  usePublicFeedback,
  useSubmitFeedback,
  useToggleFeedbackVote,
  type FeedbackKind,
  type FeedbackRequest,
} from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 最初に選んでおく種類（グッズが見つからないとき等は "content"） */
  initialKind?: FeedbackKind;
  /** 最初に入れておく題（探していた言葉など） */
  initialTitle?: string;
}

const KINDS: FeedbackKind[] = ["content", "feature", "bug", "other"];

/**
 * 運営への要望・追加してほしいコンテンツ。
 *  - 送る: 種類・題・くわしく・参考URL
 *  - みんなの要望: 運営が公開したもの。「私もほしい」で票が入る（何が求められているか運営に見える）
 *  - 送った要望: 状況（受付中/確認中/対応予定/対応済み/見送り）と運営からの一言
 */
export function FeedbackSheet({ open, onOpenChange, initialKind = "content", initialTitle = "" }: FeedbackSheetProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("send");
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const submit = useSubmitFeedback();
  const mine = useMyFeedback();
  const board = usePublicFeedback();

  // 開くたびに、渡された初期値で始める
  useEffect(() => {
    if (open) {
      setTab("send");
      setKind(initialKind);
      setTitle(initialTitle);
    }
  }, [open, initialKind, initialTitle]);

  const urlInvalid = url.trim() !== "" && !/^https?:\/\/\S+$/.test(url.trim());
  const canSend = title.trim().length > 0 && !urlInvalid && !submit.isPending;

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync({ kind, title, body, url });
      toast.success(t("engage.feedback.sent"), { description: t("engage.feedback.sentDesc") });
      setTitle("");
      setBody("");
      setUrl("");
      setTab("mine");
    } catch (e) {
      const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "";
      toast.error(message.includes("feedback_rate_limited") ? t("engage.feedback.rateLimited") : t("engage.feedback.failed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 pb-3 pt-5 text-left">
          <SheetTitle>{t("engage.feedback.title")}</SheetTitle>
          <SheetDescription>{t("engage.feedback.desc")}</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-3 grid grid-cols-3">
            <TabsTrigger value="send">{t("engage.feedback.tabSend")}</TabsTrigger>
            <TabsTrigger value="board">{t("engage.feedback.tabBoard")}</TabsTrigger>
            <TabsTrigger value="mine">{t("engage.feedback.tabMine")}</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6 pt-4">
            <div role="group" aria-label={t("engage.feedback.kindLabel")} className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    kind === k ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border hover:bg-muted/50"
                  )}
                >
                  {t(`engage.feedback.kind.${k}`)}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fb-title" className="text-sm font-medium">
                {t(`engage.feedback.titleLabel.${kind}`)}
              </label>
              <Input
                id="fb-title"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t(`engage.feedback.titlePlaceholder.${kind}`)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fb-body" className="text-sm font-medium">
                {t("engage.feedback.bodyLabel")}
              </label>
              <Textarea
                id="fb-body"
                value={body}
                maxLength={2000}
                rows={5}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t(`engage.feedback.bodyPlaceholder.${kind}`)}
              />
            </div>

            {kind === "content" && (
              <div className="space-y-1.5">
                <label htmlFor="fb-url" className="text-sm font-medium">
                  {t("engage.feedback.urlLabel")}
                </label>
                <Input
                  id="fb-url"
                  value={url}
                  inputMode="url"
                  maxLength={500}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                  aria-invalid={urlInvalid}
                />
                {urlInvalid && <p className="text-xs text-destructive">{t("engage.feedback.urlInvalid")}</p>}
                <p className="text-xs text-muted-foreground">{t("engage.feedback.urlHint")}</p>
              </div>
            )}

            {kind === "content" && <p className="rounded-lg bg-primary/5 p-2.5 text-xs text-primary">{t("engage.feedback.rewardNote")}</p>}

            <Button className="w-full gap-2" disabled={!canSend} onClick={handleSubmit}>
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("engage.feedback.submit")}
            </Button>
          </TabsContent>

          <TabsContent value="board" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-6 pt-4">
            {board.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (board.data?.items.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("engage.feedback.boardEmpty")}</p>
            ) : (
              board.data!.items.map((r) => <BoardRow key={r.id} request={r} voted={board.data!.voted.has(r.id)} />)
            )}
          </TabsContent>

          <TabsContent value="mine" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-6 pt-4">
            {mine.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (mine.data?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("engage.feedback.mineEmpty")}</p>
            ) : (
              mine.data!.map((r) => <MineRow key={r.id} request={r} />)
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ status }: { status: FeedbackRequest["status"] }) {
  const { t } = useLanguage();
  return (
    <Badge variant={status === "done" ? "default" : "secondary"} className="text-[10px]">
      {t(`engage.feedback.status.${status}`)}
    </Badge>
  );
}

function MineRow({ request }: { request: FeedbackRequest }) {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  return (
    <div className="space-y-1.5 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} />
        <span className="text-xs text-muted-foreground">{t(`engage.feedback.kind.${request.kind}`)}</span>
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(request.created_at)}</span>
      </div>
      <p className="text-sm font-medium">{request.title}</p>
      {request.admin_note && (
        <p className="rounded-lg bg-muted/60 p-2 text-xs">
          <span className="font-semibold">{t("engage.feedback.adminNote")}</span> {request.admin_note}
        </p>
      )}
    </div>
  );
}

function BoardRow({ request, voted }: { request: FeedbackRequest; voted: boolean }) {
  const { t } = useLanguage();
  const toggle = useToggleFeedbackVote();
  return (
    <div className="flex items-start gap-3 rounded-xl border p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <span className="text-xs text-muted-foreground">{t(`engage.feedback.kind.${request.kind}`)}</span>
        </div>
        <p className="text-sm font-medium">{request.title}</p>
        {request.body && <p className="line-clamp-3 text-xs text-muted-foreground">{request.body}</p>}
        {request.admin_note && <p className="text-xs">{request.admin_note}</p>}
      </div>
      <Button
        size="sm"
        variant={voted ? "default" : "outline"}
        className="h-auto shrink-0 flex-col gap-0.5 px-3 py-1.5"
        aria-pressed={voted}
        disabled={toggle.isPending}
        onClick={() => toggle.mutate({ requestId: request.id, voted })}
      >
        {voted ? <Check className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
        <span className="text-[10px] tabular-nums">{request.vote_count}</span>
        <span className="text-[10px]">{voted ? t("engage.feedback.voted") : t("engage.feedback.vote")}</span>
      </Button>
    </div>
  );
}
