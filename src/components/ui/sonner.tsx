import { Toaster as Sonner } from "sonner"
import { useColorScheme } from "@/contexts/ColorSchemeContext"

type ToasterProps = React.ComponentProps<typeof Sonner>

// next-themes の useTheme を使っていたが、そのプロバイダはマウントされておらず
// 常に "system" になっていた（アプリ内のテーマ設定に追従しない）。
// 解決済みの配色を自前のコンテキストから受け取る。
//
// 位置は画面上部に統一（以前は下部で、ボトムシートのフッターや固定ボタン・ボトムナビに
// かぶって操作しづらくなっていた）。アクション直後の「やったね」はポッケ（PockeCheerHost、
// 画面右下）が担うので、ここに残るのはエラーなど分かりやすく出したい知らせが中心。
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolved } = useColorScheme()

  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      position="top-center"
      // sonner は幅600px以下（スマホ想定）で offset とは別の CSS 変数を使うため、
      // 両方に safe-area 込みの値を渡す（mobileOffset 未対応の 1.5系では top が
      // 固定20pxになり、ノッチ端末で欠ける不具合があったため 1.7系に更新）
      offset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      duration={3500}
      gap={8}
      visibleToasts={3}
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
