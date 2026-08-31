import { PlacementType } from "@/hooks/useMyRoom";

/**
 * 部屋に置いた家具1つ分。
 *
 * この型は 2D の棚表示（room2d/ShelfView）と useRoomFurniture が使う。
 * 以前は FurnitureItem3D.tsx が定義していたが、あのファイルは three と
 * @react-three/fiber を import しているため、型を1つ借りるだけで
 * three.js（918KB）が同じチャンクに引き込まれていた。
 *
 * 3D 表示は現在どこからも到達できず、3Dモデルを持つグッズも1件も無い。
 * 型だけをここに置いて、three への依存を実際に 3D を描くファイルに閉じる。
 */
export interface RoomFurniture {
  id: string;
  furniture_id: string;
  position_x: number;
  position_y: number;
  placement: PlacementType;
  scale: number;
  rotation_y: number;
}
