import { FloatingReaction } from "@/hooks/useRoomReactions";

interface FloatingReactionsProps {
  reactions: FloatingReaction[];
}

// Overlay layer that renders floating emojis rising up the screen
export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute text-4xl animate-[floatUp_4s_ease-out_forwards]"
          style={{
            left: `${10 + r.startX * 80}%`,
            bottom: "10%",
          }}
        >
          {r.emoji}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          15% {
            transform: translateY(-30px) scale(1.2) rotate(-10deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-80vh) scale(0.8) rotate(15deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
