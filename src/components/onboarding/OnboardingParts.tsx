import { forwardRef, type ReactNode } from "react";
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

/** 見出し。上に置く絵は OnboardingArt の描き下ろし（汎用アイコンを四角に入れるのはやめた） */
export function OnboardingStepHeader({
  art,
  title,
  description,
  className,
}: {
  art?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {art && <div className="mb-4 -ml-1">{art}</div>}
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
