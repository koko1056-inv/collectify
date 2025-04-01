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
      toast.error("ログインが必要です");
      return;
    }
    
    if (!name.trim()) {
      toast.error("グループ名を入力してください");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // createGroupに正しく引数を渡す
      const newGroup = await createGroup(
        user.id, 
        name.trim(), 
        description.trim() || undefined
      );
      
      if (newGroup) {
        onCreateGroup(newGroup);
        toast.success("グループを作成しました");
        // フォームリセット
        setName("");
        setDescription("");
        onClose();
      } else {
        toast.error("グループの作成に失敗しました");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("グループの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新しいショーケースグループを作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm font-medium text-gray-900">
                グループ名
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="description" className="text-right text-sm font-medium text-gray-900">
                説明
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
