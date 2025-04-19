
import { useState } from "react";

// FormDataの型定義を更新
export interface FormData {
  title: string;
  description: string;
  category: string;
  content_name: string | null;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
  price: string;
  item_type?: string;
  [key: string]: any; // 追加のプロパティを許可
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
    item_type: "official",
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return {
    formData,
    setFormData,
    selectedTags,
    setSelectedTags,
  };
}
