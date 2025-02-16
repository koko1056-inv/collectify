
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseSubmitItemProps {
  formData: {
    title: string;
    description: string;
    content_name?: string | null;
  };
  uploadImage: () => Promise<string>;
  selectedTags: string[];
  resetForm: () => void;
}

export function useSubmitItem({
  formData,
  uploadImage,
  selectedTags,
  resetForm,
}: UseSubmitItemProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください。",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    setLoading(true);

    try {
      const imageUrl = await uploadImage();

      // Create item submission
      const { error: submissionError } = await supabase
        .from("item_submissions")
        .insert({
          title: formData.title,
          description: formData.description,
          image: imageUrl,
          price: "0",
          content_name: formData.content_name,
          submitted_by: user.id,
        });

      if (submissionError) throw submissionError;

      toast({
        title: "提案を送信しました",
        description: "アイテムの提案を受け付けました。運営による承認をお待ちください。",
      });

      resetForm();
      queryClient.invalidateQueries({ queryKey: ["item-submissions"] });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "エラー",
        description: "アイテムの提案に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit,
  };
}
