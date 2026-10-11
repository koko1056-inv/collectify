/** お世話の演出の種類と長さ（RoomFx が描き、ページが出し入れする） */

export type FxKind = "pat" | "polish" | "photo" | "photoDone" | "gift" | "levelup";

export interface RoomFxEvent {
  id: number;
  kind: FxKind;
  item?: string;
  xp?: number;
  /** プレゼントの種類（snack / special） */
  gift?: string;
  level?: number;
  name?: string;
}

/** 演出の長さ（ms）。これが過ぎたら親が消す */
export const FX_DURATION: Record<FxKind, number> = {
  pat: 2300,
  polish: 2700,
  photo: 1100,
  photoDone: 1900,
  gift: 3300,
  levelup: 3800,
};
