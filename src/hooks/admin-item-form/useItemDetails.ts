
import { useState } from "react";

interface FormData {
  title: string;
  description: string;
  content_name?: string | null;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
}

export function useItemDetails() {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    content_name: null,
    characterTag: null,
    typeTag: null,
    seriesTag: null,
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return {
    formData,
    setFormData,
    selectedTags,
    setSelectedTags,
  };
}
