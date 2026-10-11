/**
 * 標準のカバー（無料）。写真を設定していれば写真、なければ無地。
 * 無地は primary をごく薄く敷き、細かな点の地模様と上からのやわらかな光だけを置く。
 * 親（relative・overflow-hidden）いっぱいに敷く。
 */
export function DefaultCover({ imageUrl }: { imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <>
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
      </>
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-primary/10 dark:bg-primary/15">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.22) 1px, transparent 0)",
          backgroundSize: "14px 14px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
      {/* 上からのやわらかな光。ライトでは白っぽく明るく、ダークでは primary を少しだけ灯す */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          backgroundImage: "radial-gradient(90% 120% at 50% 0%, hsl(var(--background) / 0.55), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          backgroundImage: "radial-gradient(90% 120% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)",
        }}
      />
    </div>
  );
}
