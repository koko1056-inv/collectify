
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AddItemsToGroupModal } from "./AddItemsToGroupModal";
import { GroupInfo } from "@/utils/tag/types";
import { supabase } from "@/integrations/supabase/client";

interface AddItemsToGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onItemsAdded?: () => void;
}

export function AddItemsToGroupDialog({ 
  isOpen, 
  onClose, 
  groupId,
  onItemsAdded 
}: AddItemsToGroupDialogProps) {
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && groupId) {
      const fetchGroup = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();
          
          if (error) {
            console.error("Error fetching group:", error);
            toast("エラー", {
              description: "グループ情報の取得に失敗しました",
            });
            onClose();
            return;
          }
          
          setGroup(data);
        } catch (error) {
          console.error("Error in fetchGroup:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchGroup();
    }
  }, [isOpen, groupId, onClose]);

  const handleItemsAdded = () => {
    if (onItemsAdded) {
      onItemsAdded();
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <AddItemsToGroupModal
      isOpen={isOpen}
      onClose={onClose}
      group={group}
      onItemsAdded={handleItemsAdded}
    />
  );
}
