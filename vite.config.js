// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// no special 'base' needed when serving from root
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist"
  }
});
