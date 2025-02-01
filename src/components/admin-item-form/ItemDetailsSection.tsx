import { Input } from "@/components/ui/input";
import { TagInput } from "../TagInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ItemDetailsSectionProps {
  formData: {
    title: string;
    description: string;
    content_name?: string | null;
  };
  setFormData: (data: any) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export function ItemDetailsSection({
  formData,
  setFormData,
  selectedTags,
  setSelectedTags,
}: ItemDetailsSectionProps) {
  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          タイトル
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          説明
        </label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          コンテンツ
        </label>
        <Select
          value={formData.content_name || ""}
          onValueChange={(value) =>
            setFormData({ ...formData, content_name: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="コンテンツを選択" />
          </SelectTrigger>
          <SelectContent>
            {contentNames.map((content) => (
              <SelectItem key={content.id} value={content.name}>
                {content.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TagInput
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />
    </>
  );
}