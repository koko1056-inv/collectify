import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 意味の色（成功・注意・情報・ポイント）。bg-amber-500 などの直書きの代わりに使う
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
        },
        points: {
          DEFAULT: "hsl(var(--points))",
          foreground: "hsl(var(--points-foreground))",
          soft: "hsl(var(--points-soft))",
        },
        skeleton: "hsl(var(--skeleton))",
        "skeleton-foreground": "hsl(var(--skeleton-foreground))",
        "loading-bg": "hsl(var(--loading-bg))",
        "loading-overlay": "hsl(var(--loading-overlay))",
        // 統計項目用のセマンティックカラー
        stats: {
          login: "hsl(var(--stats-login))",
          "login-bg": "hsl(var(--stats-login-bg))",
          "login-hover": "hsl(var(--stats-login-hover))",
          streak: "hsl(var(--stats-streak))",
          "streak-bg": "hsl(var(--stats-streak-bg))",
          "streak-hover": "hsl(var(--stats-streak-hover))",
          items: "hsl(var(--stats-items))",
          "items-bg": "hsl(var(--stats-items-bg))",
          "items-hover": "hsl(var(--stats-items-hover))",
          content: "hsl(var(--stats-content))",
          "content-bg": "hsl(var(--stats-content-bg))",
          "content-hover": "hsl(var(--stats-content-hover))",
          member: "hsl(var(--stats-member))",
          "member-bg": "hsl(var(--stats-member-bg))",
          "member-hover": "hsl(var(--stats-member-hover))",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "page-flip-right": {
          "0%": {
            transform: "perspective(1200px) rotateY(-90deg) scale(0.9)",
            opacity: "0",
          },
          "100%": {
            transform: "perspective(1200px) rotateY(0deg) scale(1)",
            opacity: "1",
          },
        },
        "page-flip-left": {
          "0%": {
            transform: "perspective(1200px) rotateY(90deg) scale(0.9)",
            opacity: "0",
          },
          "100%": {
            transform: "perspective(1200px) rotateY(0deg) scale(1)",
            opacity: "1",
          },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        wiggle: "wiggle 0.5s ease-in-out infinite",
        "page-flip-right": "page-flip-right 0.6s ease-out",
        "page-flip-left": "page-flip-left 0.6s ease-out",
      },
      // 小さな文字の段階。text-[10px] などの直書きの代わりに使う（10px 未満は使わない）
      fontSize: {
        "3xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px: バッジ・ごく短いラベルだけ
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px: 補足・キャプション
      },
      fontFamily: {
        // Webフォント読込前/失敗時も日本語が即座に表示されるよう OS ネイティブ日本語フォントをフォールバック
        sans: [
          "Zen Kaku Gothic New",
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Yu Gothic",
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Zen Kaku Gothic New",
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Yu Gothic",
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
        righteous: ["Righteous", "cursive"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;