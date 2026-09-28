import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { readFileSync } from "node:fs";

// GitHub project pages serve from /<repo>, so the CI build sets BASE_PATH.
const base = /** @type {'' | `/${string}`} */ (process.env.BASE_PATH ?? "");

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const { GITHUB_RUN_NUMBER: run, GITHUB_SHA: sha } = process.env;
// Base version is bumped by hand with `npm version`; CI builds add run and commit.
const version =
  run && sha
    ? `${pkg.version}-beta.${run}+${sha.slice(0, 7)}`
    : `${pkg.version}+dev`;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: "404.html" }),
    paths: { base },
    version: { name: version },
  },
};

export default config;
