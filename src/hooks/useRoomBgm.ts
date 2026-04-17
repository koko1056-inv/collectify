import { useEffect, useRef, useState } from "react";
import { BGM_PRESETS, getBgmById, getRecommendedBgm } from "@/components/room3d/roomBgm";

interface UseRoomBgmOptions {
  themeId?: string;
  bgmPreset?: string | null;
  bgmUrl?: string | null;
  volume?: number;
  enabled?: boolean;
}

/**
 * Plays ambient BGM in the room. User must interact with page first
 * (browser autoplay policy). Provides a toggle.
 */
export function useRoomBgm({
  themeId,
  bgmPreset,
  bgmUrl,
  volume = 0.3,
  enabled = false,
}: UseRoomBgmOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(false);

  // Resolve the source URL: explicit bgmUrl > preset > theme default
  const resolvedUrl =
    bgmUrl ||
    (bgmPreset ? getBgmById(bgmPreset)?.url : null) ||
    (themeId ? getRecommendedBgm(themeId)?.url : null) ||
    null;

  useEffect(() => {
    if (!resolvedUrl || !enabled) {
      // Stop existing audio if disabled
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsPlaying(false);
      }
      return;
    }

    const audio = new Audio(resolvedUrl);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    // Attempt autoplay — might be blocked by browser
    audio.play()
      .then(() => {
        setIsPlaying(true);
        setCanAutoplay(true);
      })
      .catch(() => {
        setCanAutoplay(false);
      });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [resolvedUrl, enabled, volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return { isPlaying, canAutoplay, togglePlay, hasBgm: !!resolvedUrl };
}
