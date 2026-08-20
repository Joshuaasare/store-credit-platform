import Constants from "expo-constants";
import { Platform } from "react-native";

// Android emulator needs `10.0.2.2` (its alias for the host loopback); iOS
// sim + LAN devices use the host IP / localhost.
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