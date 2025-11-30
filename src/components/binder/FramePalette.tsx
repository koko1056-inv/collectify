import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FramePreset } from "@/types/binder";

interface FramePaletteProps {
  pageId: string;
  onSelectFrame: (frame: FramePreset) => void;
}

export function FramePalette({ pageId, onSelectFrame }: FramePaletteProps) {
  const { data: frames = [] } = useQuery<FramePreset[]>({
    queryKey: ["frame-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("frame_presets")
        .select("*")
        .order("category");

      if (error) throw error;
      return data as FramePreset[];
    },
  });

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">フレーム</h3>
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-2 gap-4">
          {frames.map((frame) => (
            <button
              key={frame.id}
              onClick={() => onSelectFrame(frame)}
              className="aspect-square rounded-lg hover:scale-105 transition-transform"
            >
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div
                  className="w-20 h-28 bg-gray-200"
                  style={{
                    border: frame.border_style,
                    borderRadius: `${frame.corner_radius}px`,
                    padding: `${frame.padding}px`,
                    boxShadow: frame.shadow_style || "none",
                  }}
                />
              </div>
              <p className="text-xs mt-2 text-center">{frame.name}</p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
