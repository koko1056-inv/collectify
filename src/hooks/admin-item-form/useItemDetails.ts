import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export function useItemDetails() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debouncedTitle = useDebounce(formData.title, 500);

  useEffect(() => {
    const checkDuplicateTitle = async () => {
      if (!debouncedTitle.trim()) return;
      
      const { data } = await supabase
        .from("official_items")
        .select("id")
        .eq("title", debouncedTitle)
        .maybeSingle();
      
      if (data) {
        toast({
          title: "警告",
          description: "同じタイトルのアイテムが既に存在します。",
          variant: "destructive",
        });
      }
    };

    checkDuplicateTitle();
  }, [debouncedTitle, toast]);

  return {
    formData,
    setFormData,
    selectedTags,
    setSelectedTags,
  };
}