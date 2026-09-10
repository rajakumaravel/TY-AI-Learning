import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        student: resolve(process.cwd(), "index.html"),
        admin: resolve(process.cwd(), "admin.html")
      }
    }
  }
});
