import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Heart, Loader2, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/Navbar";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { addToCollection } from "@/utils/collection-actions";
import { buildShareUrl } from "@/utils/shareLinks";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PublicItem {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  release_date: string | null;
  description: string | null;
  content_name: string | null;
  merged_into: string | null;
  item_tags: { tags: { id: string; name: string; category: string | null } | null }[];
}

/**
 * グッズの公開ページ `/item/:id`。ログイン不要で見られる。
 *
 * 検索やSNSで「このグッズ」を調べた人が最初に着く場所。
 * 写真と基本情報を見せ、登録（またはログイン済みなら追加）へつなげる。
 * 同じ作品の他のグッズも並べて、次のページへ辿れるようにする。
 */
export default function ItemPublic() {
  const { id } = useParams<{ id: string }>();
  const validId = !!id && UUID_RE.test(id);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"add" | "wish" | null>(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ["public-item", id],
    enabled: validId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(
          "id,title,image,price,release_date,description,content_name,merged_into,item_tags(tags(id,name,category))"
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as PublicItem | null) ?? null;
    },
  });

  const { data: related = [] } = useQuery({
    queryKey: ["public-item-related", item?.content_name, item?.id],
    enabled: !!item?.content_name,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("id,title,image")
        .eq("content_name", item!.content_name!)
        .is("merged_into", null)
        .neq("id", item!.id)
        .order("created_at", { ascending: false })
        .limit(9);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: state } = useQuery({
    queryKey: ["public-item-state", user?.id, item?.id],
    enabled: !!user?.id && !!item?.id,
    queryFn: async () => {
      const [owned, wished] = await Promise.all([
        supabase.from("user_items").select("id").eq("user_id", user!.id).eq("official_item_id", item!.id).limit(1),
        supabase.from("wishlists").select("id").eq("user_id", user!.id).eq("official_item_id", item!.id).limit(1),
      ]);
      return { owned: (owned.data?.length ?? 0) > 0, wished: (wished.data?.length ?? 0) > 0 };
    },
  });

  // 検索エンジン・ブラウザのタブ用。クローラー向けの完成形は /api/og が返すので、ここは人間向けの補助。
  useEffect(() => {
    if (!item) return;
    const prev = document.title;
    document.title = `${item.title}｜${item.content_name ?? "グッズ"} | Collectify`;
    return () => {
      document.title = prev;
    };
  }, [item]);

  if (!validId) return <Navigate to="/collection" replace />;
  // 重複として統合されたグッズは、統合先のページへ
  if (item?.merged_into) return <Navigate to={`/item/${item.merged_into}`} replace />;

  const owned = state?.owned ?? false;
  const wished = state?.wished ?? false;
  const loginHref = `/login?redirect=${encodeURIComponent(`/item/${id}`)}`;
  const tags = (item?.item_tags ?? [])
    .map((r) => r.tags)
    .filter((tag): tag is NonNullable<typeof tag> => !!tag && tag.category !== "source")
    .slice(0, 12);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["public-item-state", user?.id, item?.id] }),
      queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["owned-official-item-ids", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["wished-official-item-ids", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" }),
    ]);
  };

  const handleAdd = async () => {
    if (!user || !item) return;
    setBusy("add");
    try {
      const result = await addToCollection({
        userId: user.id,
        title: item.title,
        image: item.image ?? "",
        officialItemId: item.id,
        contentName: item.content_name || undefined,
        releaseDate: item.release_date,
        prize: item.price,
      });
      if (result.success) {
        toast.success(t("engage.itemPage.addedToast"));
        await refresh();
      } else {
        console.error("addToCollection failed:", result.error);
        toast.error(t("engage.itemPage.addFailed"));
      }
    } finally {
      setBusy(null);
    }
  };

  const handleWish = async () => {
    if (!user || !item) return;
    setBusy("wish");
    try {
      const { error } = await supabase.from("wishlists").insert({ user_id: user.id, official_item_id: item.id });
      if (error) throw error;
      toast.success(t("engage.itemPage.wished"));
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: ["wishlist"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["trade-matches", user.id] }),
      ]);
    } catch (e) {
      console.error("wish failed:", e);
      toast.error(t("engage.itemPage.addFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    const url = buildShareUrl({ type: "item", id: item.id });
    const text = `${item.content_name ? `${item.content_name}の` : ""}「${item.title}」 #Collectify #推し活`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success(t("engage.itemPage.linkCopied"));
    } catch {
      /* コピーできない環境では何もしない */
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : !item ? (
          <div className="space-y-4">
            <EmptyState title={t("engage.itemPage.notFoundTitle")} description={t("engage.itemPage.notFoundBody")} />
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => navigate("/")}>
                {t("engage.itemPage.backHome")}
              </Button>
            </div>
          </div>
        ) : (
          <article className="grid gap-6 md:grid-cols-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted/30">
              {item.image && (
                <img
                  src={getOptimizedImageUrl(item.image, { width: 800 })}
                  onError={fallbackToOriginal(item.image)}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <div className="space-y-1">
                {item.content_name && <p className="text-sm font-medium text-primary">{item.content_name}</p>}
                <h1 className="text-xl font-bold leading-snug text-foreground break-words">{item.title}</h1>
              </div>

              {(item.release_date || item.price) && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {item.release_date && (
                    <>
                      <dt className="text-muted-foreground">{t("engage.itemPage.releaseDate")}</dt>
                      <dd className="tabular-nums">{item.release_date}</dd>
                    </>
                  )}
                  {item.price && (
                    <>
                      <dt className="text-muted-foreground">{t("engage.itemPage.price")}</dt>
                      <dd className="tabular-nums">{item.price}</dd>
                    </>
                  )}
                </dl>
              )}

              {item.description && <p className="whitespace-pre-line text-sm text-foreground/80">{item.description}</p>}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag.id} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}

              {user ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleAdd} disabled={owned || busy !== null} className="gap-1.5">
                    {busy === "add" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : owned ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {owned ? t("engage.itemPage.added") : t("engage.itemPage.addToCollection")}
                  </Button>
                  {!owned && (
                    <Button variant="outline" onClick={handleWish} disabled={wished || busy !== null} className="gap-1.5">
                      {busy === "wish" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Heart className={wished ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} />
                      )}
                      {wished ? t("engage.itemPage.wished") : t("engage.itemPage.wish")}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleShare} className="gap-1.5">
                    <Share2 className="h-4 w-4" />
                    {t("engage.itemPage.share")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm text-foreground/80">{t("engage.itemPage.signupHint")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild>
                      <Link to={loginHref}>{t("engage.itemPage.signupCta")}</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={loginHref}>{t("engage.itemPage.login")}</Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleShare} aria-label={t("engage.itemPage.share")}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </article>
        )}

        {item && related.length > 0 && (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t("engage.itemPage.sameSeries", { series: item.content_name ?? "" })}
            </h2>
            <ul className="grid grid-cols-3 gap-2.5">
              {related.map((r) => (
                <li key={r.id} className="min-w-0">
                  <Link
                    to={`/item/${r.id}`}
                    className="block overflow-hidden rounded-xl border border-border bg-card hover:border-primary/40"
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted/30">
                      {r.image && (
                        <img
                          src={getOptimizedImageUrl(r.image, { width: 320 })}
                          onError={fallbackToOriginal(r.image)}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <p className="line-clamp-2 p-2 text-xs leading-tight">{r.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <LegalLinks className="mt-12 pb-24 sm:pb-8" />
      </main>
      <Footer />
    </div>
  );
}
