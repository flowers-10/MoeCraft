import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@moecraft/ui": fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url)),
      "@moecraft/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      less: { additionalData: '@import "@/styles/tokens.less"; @import "@/styles/mixins.less";' }
    }
  }
});
