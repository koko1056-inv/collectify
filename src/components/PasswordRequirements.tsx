import { Check, X } from "lucide-react";

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <div className="text-sm space-y-1 mt-2">
      <div className="flex items-center gap-2">
        {password.length >= 6 ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-destructive" />
        )}
        <span>パスワードは6文字以上である必要があります</span>
      </div>
    </div>
  );
}