import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateChallenge } from "@/hooks/challenges";
import { Trophy, Calendar } from "lucide-react";

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateChallengeModal({ isOpen, onClose }: CreateChallengeModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("3"); // days
  const createChallenge = useCreateChallenge();

  const handleSubmit = () => {
    if (!title.trim()) return;

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + parseInt(duration));

    createChallenge.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        ends_at: endsAt.toISOString(),
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setDuration("3");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            チャレンジを作成
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">テーマ</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: グッズのおしゃれな飾り方"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="チャレンジの詳細や参加条件など"
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              開催期間
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1日間</SelectItem>
                <SelectItem value="3">3日間</SelectItem>
                <SelectItem value="7">1週間</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">🏆 入賞ポイント</p>
            <div className="flex gap-4 text-muted-foreground">
              <span>🥇 1位: 100pt</span>
              <span>🥈 2位: 50pt</span>
              <span>🥉 3位: 30pt</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || createChallenge.isPending}
              className="flex-1"
            >
              {createChallenge.isPending ? "作成中..." : "作成"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
