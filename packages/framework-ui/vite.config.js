import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json" with { type: "json" };

// Peer and runtime dependencies stay imports, so a project installs one copy of each.
// Their stylesheets are bundled into dist/framework-ui.css instead.
const packages = [...Object.keys(pkg.peerDependencies), ...Object.keys(pkg.dependencies)];
const isExternal = (id) =>
  !id.endsWith(".css") && packages.some((name) => id === name || id.startsWith(`${name}/`));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: "src/index.js",
      formats: ["es"],
      fileName: "framework-ui",
      cssFileName: "framework-ui",
    },
    rollupOptions: { external: isExternal },
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    css: false,
  },
  optimizeDeps: {
    include: [
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-image",
      "@tiptap/extension-text-align",
      "@tiptap/extensions",
    ],
  },
});
