// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // worker/ is a separate npm package with its own tsconfig and its own
    // CI job (.github/workflows/ci.yml). `.wrangler/` in particular holds
    // Miniflare's generated bundles, which are not source and produce
    // thousands of spurious errors if linted.
    ignores: ["dist/*", "worker/**"],
  }
]);
