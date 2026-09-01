import Constants from "expo-constants";
import { Platform } from "react-native";

// Android emulator needs `10.0.2.2` (its alias for the host loopback); iOS
// sim uses localhost. Real devices on the LAN need the dev machine's IP —
// set EXPO_PUBLIC_API_BASE_URL (e.g. http://192.168.0.151:3001) in .env and
// restart Metro with --clear; Metro inlines EXPO_PUBLIC_* into the bundle so
// no native rebuild is needed. Leave it unset to fall back to the per-platform
// dev default (emulator / sim).
const DEV_API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";

const publicEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
const configured = Constants.expoConfig?.extra?.apiBaseUrl as
  | string
  | undefined;

export const API_BASE_URL = DEV_API_BASE_URL;
// export const API_BASE_URL = publicEnv ?? configured ?? DEV_API_BASE_URL;

export const SECURE_STORE_KEYS = {
  REFRESH_TOKEN: "customer-app.refresh-token",
} as const;
