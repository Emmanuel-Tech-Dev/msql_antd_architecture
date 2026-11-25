import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const frameworkSource = fileURLToPath(new URL("../packages/framework-ui/src", import.meta.url));

// The example app runs the framework from its source, so edits reload instantly.
// A real project installs @msql-antd/framework-ui and uses its built dist files.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@msql-antd\/framework-ui\/styles\.css$/, replacement: `${frameworkSource}/styles.css` },
      { find: /^@msql-antd\/framework-ui$/, replacement: `${frameworkSource}/index.js` },
    ],
  },
  build: {
    chunkSizeWarningLimit: 800,
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
