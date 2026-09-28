import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  envPrefix: ["VITE_", "PUBLIC_"],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
