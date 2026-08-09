import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    categories: { correctness: "error", suspicious: "warn" },
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "eslint/no-shadow": "off",
    },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [sveltekit()],
});
