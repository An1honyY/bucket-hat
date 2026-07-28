// Dynamic Expo config layered over app.json.
//
// Exists for one reason: `react-native-maps` on Android renders through the
// Google Maps SDK, which reads its key from `com.google.android.geo.API_KEY`
// in AndroidManifest.xml. Expo populates that from
// `android.config.googleMaps.apiKey` — but that value is an API key, so it
// can't live in the committed app.json. A dynamic config can read it from
// the environment at build time instead.
//
// Without the key the native MapView fails to initialise and takes the whole
// app down with it — a hard crash the moment the location picker opens, not
// a blank map. It went unnoticed for a long time because every earlier test
// ran on web, where LocationPickerMap.web.tsx uses Leaflet and needs no key
// at all (see DECISIONS.md, 2026-07-22).
//
// iOS is deliberately untouched: nothing here passes PROVIDER_GOOGLE, so
// iOS renders with Apple Maps, which needs no key.
module.exports = ({ config }) => {
  // Falls back to the Routes key, matching the existing single-key approach
  // (PRODUCTION_CHECKLIST.md notes placesService.ts already reuses it rather
  // than provisioning a second). The dedicated name is checked first so the
  // two can be split later without touching this file — worth doing if the
  // Maps SDK's quota ever needs isolating from Routes'.
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY;

  if (!googleMapsApiKey && process.env.EAS_BUILD_PLATFORM === "android") {
    // Loud at build time rather than as a crash on a user's phone. Not
    // thrown, so a web-only build or a config-inspection command still
    // works without the key present.
    console.warn(
      "[app.config] No Google Maps key found — Android builds will crash when the map opens. " +
        "Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (or EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY) for this build profile."
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
      },
    },
  };
};
