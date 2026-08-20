// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

// eslint-import-resolver-typescript is a direct devDependency even though
// nothing in this repo imports it: eslint-config-expo turns it on via
// `import/resolver: { typescript: true }`, and eslint-module-utils resolves
// that name from the linted file upwards. npm had it hoisted only under
// eslint-config-expo/node_modules, where that lookup misses it -- and the
// next thing it tries is the bare `typescript` package, which loads the
// compiler as a resolver and dies with "typescript with invalid interface
// loaded as resolver" on the first file. Declaring it here pins it to the
// root of node_modules instead of leaving it to hoisting luck.
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
