import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/features/matching/useMatches";
import { MatchCard } from "@/features/matching/MatchCard";
import { CollectionDiffModal } from "@/features/matching/CollectionDiffModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Matches() {
  const { user } = useAuth();
  const { data: matches = [], isLoading, refetch, isFetching } = useMatches(user?.id);
  const [compareWith, setCompareWith] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-6 max-w-5xl">
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-amber-500" />
              同担マッチング
            </h1>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              更新
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            あなたの推し・コレクション・欲しいグッズから、相性の良いファンを見つけましょう。
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">マッチが見つかりませんでした</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                興味タグやコレクション、ウィッシュリストを充実させると、相性の良いユーザーが見つかりやすくなります。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((m) => (
              <MatchCard key={m.candidate_id} match={m} onCompare={setCompareWith} />
            ))}
          </div>
        )}
      </main>

      <CollectionDiffModal
        meId={user?.id}
        otherId={compareWith}
        open={!!compareWith}
        onOpenChange={(o) => !o && setCompareWith(null)}
      />

      <Footer />
    </div>
  );
}
