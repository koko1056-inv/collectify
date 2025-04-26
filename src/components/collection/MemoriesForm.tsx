
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";

const formSchema = z.object({
  comment: z.string().optional(),
  image: z.any().optional(),
});

interface MemoriesFormProps {
  onSubmit: (data: { comment?: string; image?: File }) => void;
}

export function MemoriesForm({ onSubmit }: MemoriesFormProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
      image: undefined,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      comment: values.comment,
      image: selectedImage || undefined,
    });
    form.reset();
    setSelectedImage(null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="image"
          render={() => (
            <FormItem>
              <FormLabel>画像</FormLabel>
              <FormControl>
                <div className="relative">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      // この行は何もしません。ファイル選択はinputのonChangeイベントで処理されます
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <ImagePlus className="h-4 w-4" />
                    {selectedImage ? `選択済み: ${selectedImage.name}` : "画像を選択"}
                  </Button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>コメント</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="思い出を書いてください"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          追加
        </Button>
      </form>
    </Form>
  );
}
