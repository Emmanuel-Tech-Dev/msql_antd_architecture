import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // One copy of each, shared with @msql-antd/framework-ui.
  resolve: { dedupe: ["react", "react-dom", "antd", "react-router-dom", "@tanstack/react-query"] },
  build: { chunkSizeWarningLimit: 1500 },
});
