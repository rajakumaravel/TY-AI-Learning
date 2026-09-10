import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@netlify/identity": resolve(process.cwd(), "lib/identity-compat.mjs")
    }
  },
  build: {
    rollupOptions: {
      input: {
        student: resolve(process.cwd(), "index.html"),
        admin: resolve(process.cwd(), "admin.html")
      }
    }
  }
});
