import { Toaster as Sonner } from "sonner"
import { useColorScheme } from "@/contexts/ColorSchemeContext"

type ToasterProps = React.ComponentProps<typeof Sonner>

// next-themes の useTheme を使っていたが、そのプロバイダはマウントされておらず
// 常に "system" になっていた（アプリ内のテーマ設定に追従しない）。
// 解決済みの配色を自前のコンテキストから受け取る。
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolved } = useColorScheme()

  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
