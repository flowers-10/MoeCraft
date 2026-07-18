import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { "@moecraft/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)) }
  }
});
