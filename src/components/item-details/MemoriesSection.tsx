import { Heart, Calendar, Sparkles } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  image_url: string | null;
  comment: string | null;
  created_at: string;
}

interface MemoriesSectionProps {
  memories: Memory[];
}

export function MemoriesSection({ memories }: MemoriesSectionProps) {
  if (memories.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h4 className="font-bold text-lg">思い出のストーリー</h4>
      </div>
      
      {/* タイムライン形式で表示 */}
      <div className="relative pl-6">
        {/* タイムラインの縦線 */}
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />
        
        <div className="space-y-6">
          {memories.map((memory, index) => (
            <div key={memory.id} className="relative animate-fade-in">
              {/* タイムラインのドット */}
              <div className={cn(
                "absolute -left-4 top-0 w-4 h-4 rounded-full border-2 border-background shadow-sm",
                index === 0 ? "bg-primary" : "bg-primary/50"
              )}>
                {index === 0 && (
                  <Heart className="w-2 h-2 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              
              {/* 日付ラベル */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(memory.created_at), "yyyy年M月d日", { locale: ja })}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  ({formatDistanceToNow(new Date(memory.created_at), { addSuffix: true, locale: ja })})
                </span>
              </div>
              
              {/* メモリーカード */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10">
                {memory.image_url && (
                  <div className="relative mb-3 overflow-hidden rounded-lg">
                    <img
                      src={memory.image_url}
                      alt="思い出の写真"
                      className="w-full rounded-lg object-cover max-h-64 hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                )}
                {memory.comment && (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {memory.comment}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
