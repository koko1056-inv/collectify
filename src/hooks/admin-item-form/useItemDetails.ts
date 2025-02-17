
import { useState } from "react";

interface FormData {
  title: string;
  description: string;
  content_name?: string | null;
  item_type?: string;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
}

export function useItemDetails() {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    content_name: null,
    item_type: "official",
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
