import { supabase } from "@/integrations/supabase/client";

/**
 * 作品（content_names）を名前で探して、無ければ作る。
 *
 * キャラクターとシリーズのタグは作品に紐づく（tags.content_id）ので、
 * 作品が未登録のままタグを作ると、どの作品のキャラクターなのか分からない
 * 宙ぶらりんのタグができてしまう。
 *
 * ただし、AIが推測した作品名を無条件に作ると、
 * 誤った推測や表記揺れがそのまま作品一覧に溜まる。
 * そのため「利用者が明示的にタグ追加を選んだとき」にだけ呼ぶこと。
 *
 * @returns 作品ID。名前が空、または作成に失敗した場合は null
 */
export async function ensureContentByName(name: string | null | undefined): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  try {
    // 大文字小文字や前後の空白の違いで二重に作らないよう、まず緩めに探す
    const { data: existing, error: findError } = await supabase
      .from("content_names")
      .select("id, name")
      .ilike("name", trimmed)
      .limit(1);

    if (findError) throw findError;
    if (existing && existing.length > 0) return existing[0].id;

    const { data: created, error: insertError } = await supabase
      .from("content_names")
      .insert([{ name: trimmed, type: "anime" }])
      .select("id")
      .single();

    if (insertError) {
      // 同時に同じ作品を作ろうとして衝突した場合は、既にあるほうを使う
      const { data: retry } = await supabase
        .from("content_names")
        .select("id")
        .ilike("name", trimmed)
        .limit(1);
      if (retry && retry.length > 0) return retry[0].id;
      throw insertError;
    }

    return created?.id ?? null;
  } catch (error) {
    console.error("ensureContentByName failed:", trimmed, error);
    return null;
  }
}
