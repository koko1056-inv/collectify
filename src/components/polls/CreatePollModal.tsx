import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreatePoll } from "@/hooks/polls/usePollMutations";
import { X, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePollModal({ isOpen, onClose }: CreatePollModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const createPoll = useCreatePoll();

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      return;
    }

    // 24時間後を締切時間として設定
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + 24);

    createPoll.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        ends_at: endsAt.toISOString(),
        options: validOptions.map((text) => ({ text })),
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setOptions(["", ""]);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("social.polls.createTitle")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">{t("social.polls.title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("social.polls.titlePlaceholder")}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">{t("social.polls.descriptionOptional")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("social.polls.descriptionPlaceholder")}
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label>{t("social.polls.options")}</Label>
            <div className="space-y-2 mt-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={t("social.polls.optionPlaceholder", { index: index + 1 })}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("social.polls.addOption")}
            </Button>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t("social.polls.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || options.filter((o) => o.trim()).length < 2 || createPoll.isPending}
              className="flex-1"
            >
              {createPoll.isPending ? t("social.polls.creating") : t("social.polls.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
