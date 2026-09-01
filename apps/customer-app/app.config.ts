import type { ExpoConfig } from "@expo/config-types";

// Reads the Google Maps Android key from env (.env, gitignored) and feeds it
// to the react-native-maps plugin at prebuild. app.json is static JSON and
// cannot reference env vars — this dynamic config is the only way to keep the
// key out of the committed config. iOS uses keyless Apple Maps (no iOS key).
export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ["react-native-maps", { androidGoogleMapsApiKey }],
    ],
  };
};
