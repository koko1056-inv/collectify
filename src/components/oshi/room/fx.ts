/** お世話の演出の種類と長さ（RoomFx が描き、ページが出し入れする） */

export type FxKind = "pat" | "polish" | "photo" | "photoDone" | "gift" | "levelup" | "react";

export interface RoomFxEvent {
  id: number;
  kind: FxKind;
  item?: string;
  xp?: number;
  /** プレゼントの種類（snack / special） */
  gift?: string;
  level?: number;
  name?: string;
  /**
   * なかよしレベルの反応（react）: ひとことの翻訳キー（oshiRoom.lines.*）。出すときに選んでおく
   * （描くたびに選ぶと、描き直しで言葉が変わってしまうため）
   */
  line?: string;
  /** react: 他の人の部屋で見ているとき。ひとことの代わりに「Lv.10 一生もの」の称号を出す */
  viewer?: boolean;
  /** levelup: 受け取ったポイント */
  points?: number;
  /** levelup: 解放された部屋のアイテム（目録の key） */
  unlocks?: string[];
  /** levelup: このレベルで反応の段階が上がったら、その段階（2〜4） */
  tierUp?: number;
  /** 長さを変えたいとき（ms）。無ければ FX_DURATION */
  duration?: number;
}

/** 演出の長さ（ms）。これが過ぎたら親が消す */
export const FX_DURATION: Record<FxKind, number> = {
  pat: 2300,
  polish: 2700,
  photo: 1100,
  photoDone: 1900,
  gift: 3300,
  levelup: 3800,
  react: 2600,
};

/** レベルアップのお祝いで、特典（ポイント・解放）の札を読む時間を足す */
export const LEVELUP_WITH_REWARDS_MS = 5600;
