import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { useState } from "react";

interface MemoriesFormProps {
  isOwner: boolean;
  onSubmit: (data: { comment: string }, image: File | null) => void;
}

interface MemoryForm {
  comment: string;
}

export function MemoriesForm({ isOwner, onSubmit }: MemoriesFormProps) {
  const form = useForm<MemoryForm>();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = (data: MemoryForm) => {
    onSubmit(data, selectedImage);
    form.reset();
    setSelectedImage(null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>コメント</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={isOwner ? "思い出を書いてください..." : "コメントを書いてください..."}
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>画像</FormLabel>
          <FormControl>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
          </FormControl>
        </FormItem>
        <Button type="submit" className="w-full">
          {isOwner ? "思い出を追加" : "コメントする"}
        </Button>
      </form>
    </Form>
  );
}