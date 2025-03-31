
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createGroup } from "@/utils/tag/user-groups";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GroupInfo } from "@/utils/tag/types";

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (group: GroupInfo) => void;
}

export function CreateGroupDialog({ isOpen, onClose, onCreateGroup }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast("ログインが必要です", {
        description: "グループを作成するにはログインしてください",
      });
      return;
    }
    
    if (!name.trim()) {
      toast("エラー", {
        description: "グループ名を入力してください",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newGroup = await createGroup({
        name: name.trim(),
        description: description.trim(),
        created_by: user.id,
      });
      
      if (newGroup) {
        onCreateGroup(newGroup);
        toast("成功", {
          description: "グループを作成しました",
        });
        // フォームリセット
        setName("");
        setDescription("");
        onClose();
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast("エラー", {
        description: "グループの作成に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-base">新しいグループを作成</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              グループ名
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="グループ名を入力"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              説明 (オプション)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="グループの説明を入力"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "作成中..." : "作成する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
