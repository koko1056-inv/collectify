import { useEffect, useMemo, useRef } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OFFICIAL_ITEM_SELECT, toItems } from "@/hooks/useOfficialItems";
import type { OfficialItem } from "@/types";
import { characterCompletionRows, sameCharacterTagIds } from "@/utils/characterPage";
import { compareByRelease, summarizeCompletion, type CompletionRow } from "@/utils/zukan";

/** PostgREST が 1 回で返せる上限（既定 1000 行） */
const PAGE = 1000;
/** official_items を id で引くときの 1 回の件数（URL が長くなりすぎないように。カタログの検索と同じ 200） */
const ID_CHUNK = 200;
/** 同時に投げるリクエスト数 */
const CONCURRENCY = 4;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isTagId = (v: string | undefined | null): v is string => !!v && UUID_RE.test(v);

export interface CharacterInfo {
  id: string;
  name: string;
  contentId: string | null;
  /** 作品名（content_names.name）。作品の無いキャラタグは null */
  contentName: string | null;
  /** 同じ作品の同名キャラタグ（自分を含む）。1 人のキャラとしてまとめて数える */
  tagIds: string[];
}

/**
 * キャラ（tags.category = 'character'）の名前と作品。tag id が違う・キャラのタグでないときは null。
 * 同じ作品に同じ名前のキャラタグが複数あれば、それもまとめる（RPC get_character_completion と同じ範囲）。
 */
export function useCharacterInfo(tagId: string | undefined) {
  return useQuery<CharacterInfo | null>({
    queryKey: ["character-info", tagId],
    enabled: isTagId(tagId),
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data: tag, error } = await supabase
        .from("tags")
        .select("id,name,category,content_id,content_names(name)")
        .eq("id", tagId!)
        .maybeSingle();
      if (error) throw error;
      if (!tag || tag.category !== "character") return null;
      const contentId = tag.content_id ?? null;
      let siblingsQuery = supabase.from("tags").select("id,name,category,content_id").eq("category", "character").eq("name", tag.name);
      siblingsQuery = contentId ? siblingsQuery.eq("content_id", contentId) : siblingsQuery.is("content_id", null);
      const { data: siblings, error: sibErr } = await siblingsQuery;
      if (sibErr) throw sibErr;
      const content = (tag as { content_names?: { name?: string | null } | null }).content_names;
      return {
        id: tag.id,
        name: tag.name,
        contentId,
        contentName: content?.name ?? null,
        tagIds: sameCharacterTagIds(tag, siblings ?? []),
      };
    },
  });
}

/**
 * そのキャラのグッズを全部読む（発売の新しい順）。統合済み・一覧から外したものは出さない。
 * item_tags の tag_id（idx_item_tags_tag_id）から id を集めてから、official_items を主キーで引く。
 * キャラ 1 人は多くても数千件なので、作品全体（1 万件）を読むより軽い。
 */
export function useCharacterItems(tagIds: string[] | undefined) {
  const key = useMemo(() => [...(tagIds ?? [])].sort(), [tagIds]);
  return useQuery<OfficialItem[]>({
    queryKey: ["character-items", key],
    enabled: key.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const ids = new Set<string>();
      for (let page = 0; ; page += 1) {
        const { data, error } = await supabase
          .from("item_tags")
          .select("official_item_id")
          .in("tag_id", key)
          .order("id", { ascending: true })
          .range(page * PAGE, (page + 1) * PAGE - 1);
        if (error) throw error;
        for (const r of data ?? []) if (r.official_item_id) ids.add(r.official_item_id);
        if (!data || data.length < PAGE) break;
      }
      const all = [...ids];
      const chunks: string[][] = [];
      for (let i = 0; i < all.length; i += ID_CHUNK) chunks.push(all.slice(i, i + ID_CHUNK));
      const rows: unknown[] = [];
      for (let start = 0; start < chunks.length; start += CONCURRENCY) {
        const batch = await Promise.all(
          chunks.slice(start, start + CONCURRENCY).map(async (chunk) => {
            const { data, error } = await supabase
              .from("official_items")
              .select(OFFICIAL_ITEM_SELECT)
              .in("id", chunk)
              .is("merged_into", null)
              .eq("exclude_from_lists", false);
            if (error) throw error;
            return data ?? [];
          })
        );
        batch.forEach((b) => rows.push(...b));
      }
      return toItems(rows).sort((a, b) => compareByRelease(a, b, "desc"));
    },
  });
}

/**
 * キャラの所持率（get_character_completion）。RPC がまだ本番に無い・失敗したときは、
 * 読み込んだそのキャラのグッズと所持 id から同じ形で数える。所持が変わったら数え直す。
 */
export function useCharacterCompletion(
  tagId: string | undefined,
  characterName: string | null,
  items: OfficialItem[] | undefined,
  ownedIds: ReadonlySet<string> | null,
  ownedUpdatedAt: number
) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const queryClient = useQueryClient();
  const key = useMemo(() => ["character-completion", tagId, uid] as const, [tagId, uid]);

  const rpc = useQuery({
    queryKey: key,
    enabled: isTagId(tagId),
    staleTime: 1000 * 60,
    retry: false,
    // 失敗しても手元で数え直すので、画面の「読み込めなかった」ポッケは出さない
    meta: { silentError: true },
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_character_completion", { _tag_id: tagId! });
      if (error) throw error;
      return (data ?? []) as CompletionRow[];
    },
  });

  const lastOwnedAt = useRef(ownedUpdatedAt);
  useEffect(() => {
    const prev = lastOwnedAt.current;
    lastOwnedAt.current = ownedUpdatedAt;
    if (!tagId || !prev || prev === ownedUpdatedAt) return;
    void queryClient.invalidateQueries({ queryKey: key });
  }, [ownedUpdatedAt, tagId, key, queryClient]);

  // RPC が失敗した・空だった（まだ入っていない環境など）ときは、手元のグッズで数える
  const useFallback = rpc.isError || (rpc.isSuccess && rpc.data.length === 0);
  const fallback = useMemo(
    () => (useFallback && items && characterName ? characterCompletionRows(items, ownedIds, characterName) : null),
    [useFallback, items, ownedIds, characterName]
  );
  const rows = rpc.data && rpc.data.length > 0 ? rpc.data : fallback;
  const summary = useMemo(() => (rows ? summarizeCompletion(rows) : null), [rows]);
  return { summary, isLoading: !rows };
}
