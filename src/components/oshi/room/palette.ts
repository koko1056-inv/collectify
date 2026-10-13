/**
 * 推しの部屋のイラストの色（1か所にまとめる）。
 *
 * なぜアプリのトークン（primary / success など）を使わないか:
 *  - ここの色は「状態」ではなく、部屋という1枚の絵の絵の具。壁紙・家具は持ち主が選んだ見た目なので、
 *    見る人のテーマ色に左右されず、同じ部屋は同じ色で見せたい（プロフィールの着せ替え lib/cosmetics.ts と同じ考え）。
 *  - eslint の状態色の警告は Tailwind のクラス名にかかる。ここは SVG の fill / stroke に渡す値なので対象外。
 *    ただし色をあちこちに散らすと、ダークモードで直すときに見落とすので、すべてこのファイルに置く。
 *
 * ライト / ダーク:
 *  - 絵の具（PAINT）はどちらも同じ。ダークでは部屋全体の明るさを少し落として（ROOM_THEME.dark.filter）、
 *    暗い画面の中で部屋だけがまぶしく浮かないようにする。
 *  - 線・影・演出（ハート・きらめき・模様替えの印など）は、背景の明るさで見え方が変わるので、ROOM_THEME に
 *    ライトとダークの値を分けて持つ。CSS 変数（--room-*）にして、.dark の下で切り替える。
 */

import { OSHI_COLORS, type OshiColor } from "@/lib/cosmetics";

interface RoomThemeValues {
  /** 絵の輪郭線 */
  ink: string;
  /** 置いた物の足もとの影 */
  shadow: string;
  /** 部屋全体にかける明るさの調整（ダークだけ） */
  filter: string;
  /** 模様替え中の、選んだ物の枠と、吸い付く面の線 */
  guide: string;
  /** 空の額縁（推しを飾ろう）の点線と文字 */
  placeholder: string;
  placeholderFill: string;
  /** 夜に部屋を暗くする色（mix-blend: multiply で重ねる） */
  nightShade: string;
  /** なかよしレベルの反応の吹き出し（地・文字・縁）。部屋の絵の上に重ねるので、テーマで分ける */
  bubble: string;
  bubbleText: string;
  bubbleEdge: string;
}

export const ROOM_THEME: { light: RoomThemeValues; dark: RoomThemeValues } = {
  light: {
    ink: "#5A4350",
    shadow: "rgba(70, 40, 55, 0.18)",
    filter: "none",
    guide: "#FF5C8A",
    placeholder: "#C9A9B8",
    placeholderFill: "rgba(255, 255, 255, 0.82)",
    nightShade: "rgba(40, 46, 110, 0.32)",
    bubble: "#FFFFFF",
    bubbleText: "#5A4350",
    bubbleEdge: "#F2B8CC",
  },
  dark: {
    // 暗い画面では濃い線が背景に溶けるので、少しだけ明るい線にする
    ink: "#4A3542",
    shadow: "rgba(0, 0, 0, 0.32)",
    filter: "brightness(0.9) saturate(0.95)",
    guide: "#FF8FB1",
    placeholder: "#B49AAE",
    placeholderFill: "rgba(255, 255, 255, 0.6)",
    nightShade: "rgba(20, 24, 70, 0.4)",
    // 暗い画面で白い吹き出しだけがまぶしく浮かないよう、少し沈めた地に明るい文字
    bubble: "#2E2531",
    bubbleText: "#FBE9F1",
    bubbleEdge: "#8A5C74",
  },
};

/** ROOM_THEME を CSS 変数にした <style> の中身（.oshi-room の下で使う） */
export function roomThemeCss(): string {
  const vars = (v: RoomThemeValues) =>
    `--room-ink:${v.ink};--room-shadow:${v.shadow};--room-filter:${v.filter};--room-guide:${v.guide};` +
    `--room-placeholder:${v.placeholder};--room-placeholder-fill:${v.placeholderFill};--room-night:${v.nightShade};` +
    `--room-bubble:${v.bubble};--room-bubble-text:${v.bubbleText};--room-bubble-edge:${v.bubbleEdge};`;
  return `.oshi-room{${vars(ROOM_THEME.light)}}.dark .oshi-room{${vars(ROOM_THEME.dark)}}`;
}

/** 線の色。CSS 変数が入る前（最初の1回の描画）でも線が消えないよう、ライトの値を控えにする */
export const INK = `var(--room-ink, ${ROOM_THEME.light.ink})`;

/**
 * ROOM_THEME の CSS 変数を、ページに1回だけ入れる（部屋・ショップの見本・プロフィールの部屋で共通）。
 * 部屋ごとに <style> を置くと、ショップの見本の数だけ同じものが並ぶため
 */
export function ensureRoomTheme(): void {
  if (typeof document === "undefined" || document.getElementById("oshi-room-theme")) return;
  const el = document.createElement("style");
  el.id = "oshi-room-theme";
  el.textContent = roomThemeCss();
  document.head.appendChild(el);
}

/** 白（つや・光のすじ）と黒（影のグラデーション）。透明度を付けて重ねるので、どのテーマでも同じ */
export const LIGHT = "#FFFFFF";
export const SHADE = "#000000";

/** 演出の色。ハートはピンク、きらめきは金、おやつは焼き色。テーマ色ではなく「何が起きたか」を見分ける色 */
export const FX = {
  heart: "#FF6B9A",
  heartDeep: "#E2477A",
  heartLight: "#FFC2D6",
  sparkle: "#FFD45C",
  sparkleDeep: "#F2B21B",
  white: "#FFFFFF",
  skin: "#FFE1CC",
  skinShade: "#F6C3A6",
  cloth: "#8FD3F4",
  clothShade: "#5FB7E3",
  clothStripe: "#FFFFFF",
  camera: "#FF8FA8",
  cameraDark: "#5A4350",
  lens: "#8EC9F0",
  flash: "#FFFBEA",
  giftBox: "#FF8FB0",
  giftBoxShade: "#E86D93",
  giftRibbon: "#FFD45C",
  cookie: "#E9B276",
  cookieShade: "#C98A4F",
  choco: "#6B4232",
  gem: "#B98CFF",
  gemLight: "#E6D6FF",
  /** 紙吹雪 */
  confetti: ["#FF6B9A", "#FFD45C", "#7ED6B9", "#7FB8FF", "#B98CFF", "#FF9F6B"],
  ribbon: "#FF6B9A",
  ribbonDeep: "#D9487A",
  ribbonText: "#FFFFFF",
  /** なかよしレベルの反応: 音符（Lv7〜）と、虹のきらめき・オーラ（Lv10） */
  note: ["#B98CFF", "#7FB8FF", "#FF8FB1"],
  rainbow: ["#FF8FA8", "#FFB37A", "#FFE07A", "#8FD9A8", "#8EC9F0", "#B9A3F2"],
  /** レベルアップのお祝いで「解放」の札に使う金 */
  unlockGold: "#F2C94C",
  unlockGoldDeep: "#B8932F",
};

/** 窓の外（時間帯ごと） */
export const SKY = {
  morning: { top: "#BFE3FF", bottom: "#FFE6C4", sun: "#FFD27A", glow: "rgba(255, 220, 150, 0.6)", cloud: "#FFFFFF" },
  day: { top: "#6EC1F2", bottom: "#C9EBFF", sun: "#FFE07A", glow: "rgba(255, 240, 170, 0.6)", cloud: "#FFFFFF" },
  evening: { top: "#8E79CF", bottom: "#FFB27F", sun: "#FF8A5B", glow: "rgba(255, 150, 100, 0.55)", cloud: "#FFD0C2" },
  night: { top: "#18204A", bottom: "#33407E", sun: "#FFF2B8", glow: "rgba(255, 242, 184, 0.35)", cloud: "#4A5694" },
  star: "#FFF6D0",
  /** 窓から見える遠くの街 */
  city: { morning: "#A9C8E6", day: "#A9C8E6", evening: "#9C7BB8", night: "#2A3266" },
  frame: "#FFFFFF",
  frameShade: "#E8DCD5",
  sill: "#F4E9E2",
};

/** なかよし度のレベルで、フレームのまわりにかける光（Lv3 銅・Lv5 銀・Lv7 金・Lv10 虹）。以前の枠の色（frameClass）と同じ段階 */
export const LEVEL_GLOW = {
  bronze: "rgba(214, 140, 70, 0.55)",
  silver: "rgba(170, 186, 210, 0.75)",
  gold: "rgba(251, 191, 36, 0.75)",
  rainbow: "rgba(244, 114, 182, 0.85)",
};

/** 朝と昼に窓から床へ差す光（白を薄く重ねる） */
export const SUNBEAM = "#FFFFFF";
/** 夕方の部屋の色味（multiply で薄く重ねる） */
export const EVENING_TINT = "rgba(255, 150, 90, 0.12)";
/** 模様替え中の印（点の格子・壁と床の境目・選んでいない物の点線）。部屋の絵の上に重ねるので、どのテーマでも白 */
export const EDIT_MARK = {
  grid: "rgba(255, 255, 255, 0.35)",
  floorLine: "rgba(255, 255, 255, 0.6)",
  idle: "rgba(255, 255, 255, 0.85)",
  halo: "rgba(255, 255, 255, 0.7)",
};

/** 夜に灯る明かりの色 */
export const LAMP_GLOW = "rgba(255, 214, 140, 0.8)";
export const LAMP_GLOW_EDGE = "rgba(255, 214, 140, 0)";

/** 推し色（明るめ・濃いめ）。推し色セットの壁紙・床・家具に使う */
export function oshiPaint(color: OshiColor) {
  const c = OSHI_COLORS[color];
  return { base: c.base, deep: c.deep, light: mix(c.base, "#FFFFFF", 0.72), mid: mix(c.base, "#FFFFFF", 0.4) };
}

/** 2色を混ぜる（#RRGGBB）。t は b の割合 */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) * (1 - t) + ch(pb, s) * t);
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`;
}

/** 壁紙・床・家具・フレームの絵の具。キーは目録（lib/oshiRoom.ts）と同じ */
export const PAINT = {
  wall: {
    "base.cream": { base: "#FFF3E0", pattern: "#F6DDBA", accent: "#FFFFFF", curtain: "#FFB8C8", curtainShade: "#F294AC" },
    "base.mint": { base: "#DCF3E9", pattern: "#C4E8D8", accent: "#FFFFFF", curtain: "#FFE29A", curtainShade: "#F3C766" },
    "base.lilac": { base: "#ECE3FA", pattern: "#D9CBF3", accent: "#FFFFFF", curtain: "#B9E3F7", curtainShade: "#8FCBEA" },
    "sakura.wall": { base: "#FDE8EF", pattern: "#F6B9CC", accent: "#FFFFFF", curtain: "#FFFFFF", curtainShade: "#F4D7E1" },
    "natsu.wall": { base: "#1E2B5E", pattern: "#2E3F80", accent: "#FFE7A3", curtain: "#3E8DD0", curtainShade: "#2C6DA8" },
    "halloween.wall": { base: "#3A2953", pattern: "#271A3B", accent: "#F59A3C", curtain: "#7A4FB0", curtainShade: "#5A378A" },
    "xmas.wall": { base: "#F8F2E7", pattern: "#C9DDEE", accent: "#D84A55", curtain: "#D84A55", curtainShade: "#B0333F" },
    "yumekawa.wall": { base: "#FBE3F3", pattern: "#FFFFFF", accent: "#CDE9FF", curtain: "#D8C7FF", curtainShade: "#B9A3F2" },
    "showcase.wall": { base: "#18203F", pattern: "#222C55", accent: "#F2D27C", curtain: "#7C1E3A", curtainShade: "#5E1229" },
    "library.wall": { base: "#EFE3C8", pattern: "#DCCBA6", accent: "#C99A3E", curtain: "#2F5E4E", curtainShade: "#214437" },
    "cafe.wall": { base: "#F3DCC6", pattern: "#DDAA86", accent: "#FFF6EA", curtain: "#7FA36B", curtainShade: "#5E8550" },
    "space.wall": { base: "#141A3C", pattern: "#2A2F6B", accent: "#FFF6D0", curtain: "#5A4FCF", curtainShade: "#3F36A3" },
    "beach.wall": { base: "#B9E4FA", pattern: "#3BA7D8", accent: "#FFE07A", curtain: "#FFFFFF", curtainShade: "#CFE6F2" },
    "live.wall": { base: "#1C1430", pattern: "#2A1F45", accent: "#FFD45C", curtain: "#C2263F", curtainShade: "#8E1529" },
    "retro.wall": { base: "#2B2150", pattern: "#3A2C6E", accent: "#53E3D0", curtain: "#2FB8A8", curtainShade: "#1F8C80" },
    "lv5.wall": { base: "#2E2A5C", pattern: "#4A4590", accent: "#FFE9A8", curtain: "#B9A3F2", curtainShade: "#9580D9" },
    "lv10.wall": { base: "#FFF4F8", pattern: "#FFFFFF", accent: "#FFFFFF", curtain: "#FFFFFF", curtainShade: "#EBD9F2" },
  } as Record<string, { base: string; pattern: string; accent: string; curtain: string; curtainShade: string }>,
  yumekawaSky: ["#FFD6EC", "#E5D6FF", "#CFF1FF"],
  /** 夏祭りの壁（夜空）の上の色と、花火 */
  natsuSkyTop: "#141D45",
  fireworks: ["#FFD45C", "#FF8FB1", "#7ED6B9", "#8EC9F0"],
  /** クリスマスの壁の上のガーランド */
  xmasGarland: "#3F9E64",
  /** スポットライト・台座の光の帯 */
  beam: "#FFF6D2",
  /** 目録に無い家具（古いアプリなど）の代わりの四角 */
  missing: "#EEEEEE",
  floor: {
    "base.wood": { base: "#E9C79D", line: "#D2A877", edge: "#C9935E", board: "#FFF6EA" },
    "base.carpet": { base: "#F5D2DA", line: "#ECBCC8", edge: "#E0A1B2", board: "#FFF6F8" },
    "sakura.tatami": { base: "#D5DCA6", line: "#BCC489", edge: "#5E6E3E", board: "#F6F0DE" },
    "natsu.engawa": { base: "#B98A5C", line: "#9C6F44", edge: "#7F5734", board: "#D9B58D" },
    "halloween.floor": { base: "#4A3560", line: "#2E2140", edge: "#F59A3C", board: "#2E2140" },
    "xmas.floor": { base: "#C8414B", line: "#B0333F", edge: "#E9C46A", board: "#F8F2E7" },
    "yumekawa.floor": { base: "#FFDDEF", line: "#D6EEFF", edge: "#C9B4FF", board: "#FFFFFF" },
    "showcase.floor": { base: "#ECEAF3", line: "#CFCBDD", edge: "#B8A26A", board: "#2A3360" },
    "library.floor": { base: "#B98559", line: "#94643D", edge: "#6E4526", board: "#5B3A29" },
    "cafe.floor": { base: "#D98B5F", line: "#F3E2D2", edge: "#B8693F", board: "#FFF6EA" },
    "space.floor": { base: "#5C6688", line: "#3E4766", edge: "#7FE3FF", board: "#2A3156" },
    "beach.floor": { base: "#F2DDB0", line: "#E3C68E", edge: "#D9B57A", board: "#F7F0E0" },
    "live.floor": { base: "#22182F", line: "#3A2D52", edge: "#FF6B9A", board: "#140E1E" },
    "altar.floor": { base: "#FFF5F8", line: "#F3DDE6", edge: "#F0C6D6", board: "#FFFFFF" },
    "retro.floor": { base: "#1E1640", line: "#E35BFF", edge: "#53E3D0", board: "#120C2A" },
    "lv7.floor": { base: "#FBF6EA", line: "#E2C36A", edge: "#B8932F", board: "#FFF4D6" },
  } as Record<string, { base: string; line: string; edge: string; board: string }>,
  wood: { light: "#F2D2A7", mid: "#E0B27E", dark: "#B9824F", deep: "#8E5E36" },
  white: "#FFFFFF",
  cream: "#FFF8EE",
  rug: { base: "#FFD4DE", edge: "#FFB1C4", dot: "#FFFFFF" },
  plant: { leaf: "#7CCB8B", leafDeep: "#4FA866", pot: "#F6A986", potShade: "#E3866A" },
  lamp: { shade: "#FFE3A3", shadeDeep: "#F5C866", pole: "#8E6A55", bulb: "#FFF4C9" },
  penlight: ["#FF6B9A", "#7FB8FF", "#FFD45C", "#7ED6B9"],
  penlightGrip: "#5A4350",
  cup: "#FFFFFF",
  sakura: { petal: "#FFC2D4", petalLight: "#FFD6E2", petalDeep: "#F48FB0", trunk: "#8A5A44", pot: "#5C7FA8", potShade: "#456790" },
  chochin: { body: "#FF7A5C", rib: "#E25A3E", cap: "#3B2A2A", text: "#FFF4D6", glow: "#FFF4C9" },
  kingyo: { water: "#BFE8FF", glass: "rgba(255,255,255,0.6)", fish: "#FF6B4A", fin: "#FFB09A", stand: "#B98A5C", weed: "#59B57A" },
  pumpkin: { body: "#F59A3C", rib: "#D97A1E", stem: "#4E8A3E", face: "#5A2A12", glow: "#FFE08A" },
  ghost: { body: "#FFFFFF", shade: "#E6E3F5", cheek: "#FFB8C8", eye: "#3A2953" },
  xmasTree: { leaf: "#3F9E64", leafDeep: "#2D7D4C", trunk: "#8A5A44", star: "#FFD45C", lights: ["#FF6B6B", "#FFD45C", "#7FB8FF", "#FF9FE0"], lightGlow: "rgba(255, 230, 150, 0.9)" },
  gifts: { a: "#D84A55", b: "#3F9E64", c: "#7FB8FF", ribbon: "#FFD45C" },
  cloud: { body: "#FFFFFF", shade: "#EDE4FF", cheek: "#FFC2DE", star: "#FFE07A" },
  moon: { body: "#FFF0A8", shade: "#F5D96A", cheek: "#FFB8C8", string: "#E6CFA0" },
  showcase: { glass: "rgba(200, 225, 255, 0.28)", frame: "#D9B95E", frameDeep: "#A98935", shelf: "rgba(255,255,255,0.7)", base: "#2A3360" },
  pedestal: { body: "#F4F2F8", shade: "#D6D2E2", gold: "#E2C36A", beam: "rgba(255, 246, 210, 0.35)" },
  /** 図書室の壁の下の腰板・本の背の色・地球儀 */
  library: { panel: "#8A5A3C", panelDeep: "#6B4329", rail: "#C99A3E", books: ["#B5443B", "#2F5E4E", "#3D5A8A", "#C99A3E", "#7A4A7E", "#E3D3B5", "#D9774A"] },
  globe: { sea: "#6FB6E8", land: "#7CCB8B", landDeep: "#4FA866", brass: "#C99A3E", brassDeep: "#9C7428" },
  cafe: { panel: "#7FA36B", panelDeep: "#5E8550", steel: "#C9CDD6", steelDeep: "#8C93A3", coffee: "#6B4232", sign: "#2F4A3E" },
  sweets: { plate: "#FFFFFF", gold: "#E2C36A", berry: "#FF6B7A", cream: "#FFF6EA", sponge: "#F6D49A", choco: "#8A5A44", macaron: ["#FFB8C8", "#BFE8D8", "#FFE29A", "#D8C7FF"] },
  space: { nebula: ["#8E6BFF", "#FF7FC8"], planet: "#FFB37A", planetBand: "#F28C4C", planetRing: "#B98CFF" },
  rocket: { body: "#F4F2F8", shade: "#D6D2E2", fin: "#FF6B6B", finDeep: "#D84A55", window: "#8EC9F0", flame: "#FFD45C", flameDeep: "#FF8A3D" },
  saturn: { body: "#FFC27A", band: "#F29E4C", ring: "#B98CFF", ringDeep: "#8E62E0", chain: "#C9CDD6" },
  beach: { skyTop: "#7CCBF5", sea: "#3BA7D8", seaDeep: "#2A86B8", foam: "#FFFFFF", sun: "#FFE07A", gull: "#FFFFFF", shell: "#FFD9C9", star: "#FF9F6B" },
  parasol: { a: "#FF7A85", b: "#FFFFFF", pole: "#E9D3A8", poleDeep: "#C9A87A", top: "#FFD45C" },
  float: { a: "#FF6B6B", b: "#FFFFFF", rope: "#C9935E", hook: "#B9824F" },
  live: { beams: ["#FF6B9A", "#7FB8FF", "#FFD45C"], fringe: "#F2C94C", led: "#7FB8FF" },
  speaker: { body: "#2A2438", grille: "#433A57", cone: "#16121F", rim: "#7A6F93", led: "#7ED6B9" },
  mic: { stand: "#3A3348", head: "#C9CDD6", headDeep: "#8C93A3", grip: "#5A4350" },
  fans: { second: "#FFD45C", handle: "#F4F2F8" },
  altar: { gold: "#E8C766", goldDeep: "#B8932F", lace: "#FFFFFF", leaf: "#7CCB8B", leafDeep: "#4FA866", easel: "#E9D3A8", easelDeep: "#C9A87A" },
  retro: { body: "#5B4FCF", side: "#3F36A3", screen: "#1B2A4A", glow: "#53E3D0", marquee: "#FF6BB0", buttons: ["#FF6B9A", "#FFD45C", "#53E3D0"], pixel: "#FF6BB0" },
  crt: { body: "#E9D9C4", bodyShade: "#CDB89E", screen: "#2B3A55", glow: "#9FE8FF", knob: "#8E6A55", console: "#C9C9D2", consoleDeep: "#9A9AA8" },
  cushion: { body: "#FF8FB0", shade: "#E86D93", tassel: "#FFD45C", stitch: "#FFD6E2" },
  trophy: { gold: "#F2C94C", deep: "#C99A1E", light: "#FFF0B8", base: "#8E5E36", baseDeep: "#6E4526", heart: "#FF6B9A" },
  chandelier: { gold: "#E2C36A", deep: "#B8932F", crystal: "#DDF0FF", candle: "#FFF6EA", flame: "#FFD45C" },
  rainbow: ["#FF8FA8", "#FFB37A", "#FFE07A", "#8FD9A8", "#8EC9F0", "#B9A3F2"],
  constellation: { line: "#C9C3FF", star: "#FFE9A8" },
  /** グッズのフレーム */
  frame: {
    wood: { face: "#E7BE8A", inner: "#C9935E", shine: "#F7DDB6" },
    acrylic: { edge: "rgba(255,255,255,0.75)", base: "#E9F2FF", baseShade: "#C9D9F2", rim: "#FFFFFF" },
    badge: { rim: "#F1F1F4", rimShade: "#C9C9D2", shine: "rgba(255,255,255,0.65)" },
    photo: { face: "#FFFFFF", shade: "#EAE2DC", leg: "#C9B8AC" },
    sakura: { face: "#FFE3EC", petal: "#FFB3C9", petalDeep: "#F48FB0" },
    uchiwa: { face: "#FFFFFF", rim: "#3E8DD0", handle: "#D9B58D", handleDeep: "#B98A5C", wave: "#BFE3FF" },
    halloween: { face: "#2E2140", inner: "#F59A3C", web: "#E6E3F5" },
    wreath: { leaf: "#3F9E64", leafDeep: "#2D7D4C", berry: "#D84A55", bow: "#D84A55", bowDeep: "#B0333F" },
    heart: { face: "#FFC6E3", rim: "#FFFFFF", shine: "#FFE6F3" },
    gold: { face: "#E8C766", deep: "#B8932F", light: "#FFF0B8" },
    antique: { face: "#C9A45A", deep: "#8E6A2E", light: "#F2DFA6" },
    chalk: { board: "#2F4A3E", wood: "#B9824F", woodDeep: "#8E5E36", chalk: "#FFFFFF", chalkPink: "#FFB8C8", chalkYellow: "#FFE29A" },
    porthole: { metal: "#B7C0D6", deep: "#7D879F", bolt: "#E6EAF3" },
    shell: { face: "#FFE3D6", deep: "#F2A98F", pearl: "#FFFFFF", star: "#FF9F6B" },
    ticket: { face: "#FFF4D6", punch: "#5A4350", line: "#E8D3A6" },
    lace: { face: "#FFFFFF", dot: "#F3DDE6" },
    pixel: { a: "#53E3D0", b: "#FF6BB0", dark: "#2B2150" },
    flower: { a: "#FFB3C9", b: "#FFE07A", c: "#B9E3F7", leaf: "#7CCB8B", center: "#FFF6EA" },
    crown: { gold: "#F2C94C", deep: "#C99A1E", light: "#FFF0B8", gems: ["#FF6B9A", "#7FB8FF", "#7ED6B9"], pearl: "#FFFFFF" },
  },
};
