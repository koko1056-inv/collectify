import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // lovable-tagger は JSX 要素に data-lov-* 属性を挿入するが、
    // @react-three/fiber の applyProps と衝突するため無効化
  ].filter(Boolean),
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
