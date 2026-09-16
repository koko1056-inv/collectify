import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          // 小さくて多くのパッケージから使われるものは、先に共通チャンクへ逃がす。
          // 行き先を決めずにおくと Rollup が大きな手動チャンク（three-vendor）へ
          // 吸い込み、prop-types を1つ借りたいだけのページが three.js 918KB を
          // まるごと読み込むことになる。実際 72チャンク中21がそうなっていた。
          if (id.includes("/prop-types/") || id.includes("/@babel/runtime/"))
            return "common-vendor";
          if (id.includes("react-router")) return "react-vendor";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("scheduler")
          )
            return "react-vendor";
          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("cmdk") || id.includes("vaul"))
            return "ui-vendor";
          if (
            id.includes("three") ||
            id.includes("@react-three") ||
            id.includes("postprocessing")
          )
            return "three-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "chart-vendor";
          if (id.includes("framer-motion")) return "motion-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("date-fns")) return "date-vendor";
          if (id.includes("html2canvas") || id.includes("html5-qrcode"))
            return "media-vendor";
        },
      },
    },
  },
}));
