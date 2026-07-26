import { defineConfig } from "astro/config";
import markdoc from "@astrojs/markdoc";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";

const enableStudio = process.env.SKIP_KEYSTATIC !== "true";

export default defineConfig({
  site: "https://gueess.github.io",
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    react(),
    markdoc(),
    ...(enableStudio ? [keystatic()] : []),
  ],
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
