
import { useState } from "react";

interface FormData {
  title: string;
  description: string;
  category: string;
  content_name?: string | null;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
  price: string;
}

export function useItemDetails() {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    content_name: null,
    characterTag: null,
    typeTag: null,
    seriesTag: null,
    price: "",
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return {
    formData,
    setFormData,
    selectedTags,
    setSelectedTags,
  };
}
