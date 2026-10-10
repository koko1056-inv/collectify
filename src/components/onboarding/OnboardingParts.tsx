import { forwardRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ウェルカム（初回オンボーディング）の各ステップで共通に使う部品。
 * アプリ本体と同じ見た目（primary 単色・rounded-2xl のカード・控えめな影）に揃える。
 */

/** 主ボタン。画面下の固定バーに置く、横いっぱいのボタン（shadcn の Button そのまま、高さだけ h-12） */
export const OnboardingPrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(function OnboardingPrimaryButton(
  { className, ...props },
  ref
) {
  return <Button ref={ref} size="lg" className={cn("h-12 w-full text-base font-bold", className)} {...props} />;
});

/** 見出し。アイコンは EmptyState と同じく「primary の薄い面に primary のアイコン」 */
export function OnboardingStepHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <h2 className="text-2xl font-bold leading-tight">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** 画面下に固定する操作バー。ステップの縦並び（flex-col）の最後に置く */
export function OnboardingBottomBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "shrink-0 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur",
        className
      )}
    >
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}
