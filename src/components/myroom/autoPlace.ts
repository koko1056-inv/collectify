import { supabase } from "@/integrations/supabase/client";
import { RoomItem } from "@/hooks/useMyRoom";
import { findNextSlot, ROOM_SLOTS, SLOT_PRIORITY } from "./roomSlots";

// position_x をスロットIDとして再解釈する
// 既存スキーマを変更せず position_x: 0..N をスロットID, position_y を未使用 (0) とする
export function getItemSlotId(item: RoomItem): number {
  return Math.max(0, Math.min(ROOM_SLOTS.length - 1, Math.round(item.position_x ?? 0)));
}

// ルームに新しいアイテムを追加 (空きスロットに自動挿入)
export async function placeItemAuto(params: {
  roomId: string;
  userItemId?: string | null;
  officialItemId?: string | null;
  customImageUrl?: string | null;
  occupiedSlotIds: Set<number>;
}): Promise<{ ok: boolean; reason?: string }> {
  const slot = findNextSlot(params.occupiedSlotIds);
  if (!slot) {
    return { ok: false, reason: "部屋が満員です。お気に入りを少し外してね" };
  }

  const { error } = await supabase.from("binder_items").insert({
    binder_page_id: params.roomId,
    user_item_id: params.userItemId ?? null,
    official_item_id: params.officialItemId ?? null,
    custom_image_url: params.customImageUrl ?? null,
    position_x: slot.id, // スロットIDを保存
    position_y: 0,
    width: slot.w,
    height: slot.h,
    rotation: 0,
    z_index: slot.z,
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

// ランダム再配置 (シャッフル)
export async function shuffleRoom(roomId: string, items: RoomItem[]): Promise<void> {
  const slots = [...SLOT_PRIORITY].sort(() => Math.random() - 0.5);
  await Promise.all(
    items.map((item, i) => {
      const slotId = slots[i % slots.length];
      const slot = ROOM_SLOTS.find((s) => s.id === slotId)!;
      return supabase
        .from("binder_items")
        .update({
          position_x: slot.id,
          position_y: 0,
          width: slot.w,
          height: slot.h,
          z_index: slot.z,
        })
        .eq("id", item.id);
    }),
  );
}

// アイテムを部屋から外す
export async function removeFromRoom(itemId: string): Promise<void> {
  await supabase.from("binder_items").delete().eq("id", itemId);
}

// テーマを保存 (background_color に theme:<id> 形式)
export async function setRoomTheme(roomId: string, themeId: string): Promise<void> {
  await supabase
    .from("binder_pages")
    .update({ background_color: `theme:${themeId}` })
    .eq("id", roomId);
}
