/** 部屋の絵で何度も使う形（パスの文字列だけ。色は呼ぶ側が palette から渡す） */

/** 四芒星（きらめき）。辺を内側に反らせた形 */
export function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.18;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

/** ハート。(cx, cy) が中心、s が横幅のおよそ半分 */
export function heartPath(cx: number, cy: number, s: number): string {
  return (
    `M${cx} ${cy + s * 0.8}` +
    `C${cx - s * 0.2} ${cy + s * 0.6} ${cx - s} ${cy + s * 0.1} ${cx - s} ${cy - s * 0.35}` +
    `C${cx - s} ${cy - s * 0.85} ${cx - s * 0.35} ${cy - s * 1.0} ${cx} ${cy - s * 0.55}` +
    `C${cx + s * 0.35} ${cy - s * 1.0} ${cx + s} ${cy - s * 0.85} ${cx + s} ${cy - s * 0.35}` +
    `C${cx + s} ${cy + s * 0.1} ${cx + s * 0.2} ${cy + s * 0.6} ${cx} ${cy + s * 0.8}Z`
  );
}

/** 五芒星 */
export function starPath(cx: number, cy: number, r: number, inner = 0.45): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(ang)).toFixed(2)} ${(cy + rr * Math.sin(ang)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** もこもこの雲（3つの丸と底） */
export function cloudPath(x: number, y: number, w: number): string {
  const h = w * 0.42;
  return (
    `M${x} ${y}` +
    `a${h * 0.5} ${h * 0.5} 0 0 1 ${w * 0.22} ${-h * 0.55}` +
    `a${h * 0.62} ${h * 0.62} 0 0 1 ${w * 0.42} ${-h * 0.2}` +
    `a${h * 0.48} ${h * 0.48} 0 0 1 ${w * 0.36} ${h * 0.75}` +
    `Z`
  );
}

/** 花びら（桜）。根もとが (x, y)、長さ len、向き deg */
export function petalPath(x: number, y: number, len: number, deg: number): string {
  const r = (deg * Math.PI) / 180;
  const tip = [x + Math.cos(r) * len, y + Math.sin(r) * len];
  const n = [-Math.sin(r) * len * 0.45, Math.cos(r) * len * 0.45];
  const mid = [x + Math.cos(r) * len * 0.55, y + Math.sin(r) * len * 0.55];
  // 先に小さな切れ込みのある花びら
  const notch = [x + Math.cos(r) * len * 0.86, y + Math.sin(r) * len * 0.86];
  return (
    `M${x} ${y}` +
    `Q${mid[0] + n[0]} ${mid[1] + n[1]} ${tip[0] + n[0] * 0.35} ${tip[1] + n[1] * 0.35}` +
    `L${notch[0]} ${notch[1]}` +
    `L${tip[0] - n[0] * 0.35} ${tip[1] - n[1] * 0.35}` +
    `Q${mid[0] - n[0]} ${mid[1] - n[1]} ${x} ${y}Z`
  );
}
