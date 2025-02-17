
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategoryTagSelectProps {
  category: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CategoryTagSelect({ category, label, value, onChange }: CategoryTagSelectProps) {
  const { data: tags = [] } = useQuery({
    queryKey: ["tags", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
      </label>
      <Select
        value={value || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : val)}
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder={`${label}を選択`} />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="none" className="hover:bg-gray-100">選択なし</SelectItem>
          {tags.map((tag) => (
            <SelectItem 
              key={tag.id} 
              value={tag.name}
              className="hover:bg-gray-100"
            >
              {tag.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
