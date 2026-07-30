// docs/10-production-readiness.md §10.1 — release builds must never log API
// keys or full network payloads via console.log; strip all console calls
// from production JS bundles (EAS `production`/`preview` profiles set
// NODE_ENV=production) while keeping them for local dev/test.
module.exports = function (api) {
  const isProduction = api.env("production");
  api.cache.using(() => isProduction);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // `react-native-worklets/plugin`, not `react-native-reanimated/plugin`.
      // As of Reanimated 4 the worklet transform lives in its own package,
      // and the old path is a one-line shim that just re-exports this — so
      // naming it directly is the same transform without depending on a
      // compatibility alias that will eventually be dropped.
      "react-native-worklets/plugin",
      ...(isProduction ? ["transform-remove-console"] : []),
    ],
  };
};
