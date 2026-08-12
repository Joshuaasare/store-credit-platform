import Constants from "expo-constants";
import { Platform } from "react-native";

// Backend origin. The Android emulator can't reach the host's `localhost`
// directly — it needs `10.0.2.2` (the emulator's alias for the host loopback).
// The iOS simulator and physical devices on the same LAN use the host IP.
const DEV_API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";

const configured = Constants.expoConfig?.extra?.apiBaseUrl as
  | string
  | undefined;

export const API_BASE_URL =
  configured && configured.length > 0 ? configured : DEV_API_BASE_URL;

export const SECURE_STORE_KEYS = {
  REFRESH_TOKEN: "customer-app.refresh-token",
} as const;