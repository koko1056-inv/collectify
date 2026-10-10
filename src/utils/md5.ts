/**
 * 文字列（UTF-8）の MD5 を16進32文字で返す。同期で計算できる小さな実装。
 *
 * カタログ画像のサムネのパスは Postgres の md5(official_items.image) で決めている
 * （supabase/migrations/20261011600000_catalog_image_thumbs.sql）。画面側でも同じ値を
 * 描画中に計算したいが、Web Crypto には MD5 が無く非同期なので、ここで計算する。
 * 暗号用途には使わないこと（パスの名前付けにだけ使う）。
 */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

const encoder = new TextEncoder();

export function md5Hex(input: string): string {
  const bytes = encoder.encode(input);
  const bitLen = bytes.length * 8;
  // 末尾に 0x80 と長さ（64bit・リトルエンディアン）を足して 64 バイトの倍数にする
  const total = (((bytes.length + 8) >> 6) + 1) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 8, bitLen >>> 0, true);
  view.setUint32(total - 4, Math.floor(bitLen / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const M = new Array<number>(16);

  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = view.getUint32(off + j * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      const x = (a + f + K[i] + M[g]) | 0;
      b = (b + ((x << S[i]) | (x >>> (32 - S[i])))) | 0;
      a = tmp;
    }
    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  let out = "";
  for (const word of [a0, b0, c0, d0]) {
    for (let i = 0; i < 4; i++) out += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
  }
  return out;
}
