import { Orbit } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";

interface UniverseEntryCardProps {
  onOpen: () => void;
}

/** コレクション上部の入口。宇宙の色味で、棚の一覧とは別の見せ方があると伝える */
export function UniverseEntryCard({ onOpen }: UniverseEntryCardProps) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b0926] p-3 text-left text-white shadow-sm transition-transform active:scale-[0.99]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 30%, rgba(120,80,230,0.55), transparent 45%), radial-gradient(circle at 88% 80%, rgba(40,150,230,0.4), transparent 50%), radial-gradient(circle at 60% 10%, rgba(230,80,160,0.3), transparent 40%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 45% 70%, #fff, transparent), radial-gradient(1.5px 1.5px at 70% 25%, #fff, transparent), radial-gradient(1px 1px at 85% 60%, #fff, transparent), radial-gradient(1px 1px at 33% 85%, #fff, transparent), radial-gradient(1.5px 1.5px at 92% 15%, #fff, transparent)",
        }}
      />
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
        <Orbit className="h-5 w-5 transition-transform duration-700 group-hover:rotate-90" aria-hidden />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-sm font-bold">{t("universe.entryTitle")}</span>
        <span className="block truncate text-xs text-white/75">{t("universe.entryDesc")}</span>
      </span>
      <span className="relative shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
        {t("universe.entryCta")}
      </span>
    </button>
  );
}
