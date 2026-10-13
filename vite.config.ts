import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site from /<repo-name>/.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/tarkov-companion/" : "/",
  plugins: [react()],
});
