import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContentNameSelectProps {
  type: "anime" | "artist";
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function ContentNameSelect({
  type,
  value,
  onChange,
  label,
}: ContentNameSelectProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .eq("type", type)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleAddNewName = async () => {
    if (!newName.trim()) {
      toast({
        title: "エラー",
        description: "名前を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("content_names")
        .insert([{ name: newName.trim(), type }]);

      if (error) throw error;

      toast({
        title: "追加完了",
        description: `${newName}を追加しました`,
      });

      queryClient.invalidateQueries({ queryKey: ["content-names"] });
      setNewName("");
      setIsDialogOpen(false);
      onChange(newName.trim());
    } catch (error) {
      console.error("Error adding content name:", error);
      toast({
        title: "エラー",
        description: "追加に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`${label}を選択`} />
        </SelectTrigger>
        <SelectContent>
          {contentNames.map((content) => (
            <SelectItem key={content.id} value={content.name}>
              {content.name}
            </SelectItem>
          ))}
          <SelectItem value="other" className="text-blue-600">
            その他...
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しい{label}を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder={`${label}名を入力`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button
              onClick={handleAddNewName}
              className="w-full"
            >
              追加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}