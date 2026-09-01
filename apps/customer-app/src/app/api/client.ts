import {
  createCustomerAuthService,
  createCustomerCreditsService,
  createCustomerActivitiesService,
  createCustomerRedemptionsService,
  createCustomerProfileService,
  createCustomerBranchService,
  createCustomerConfigInteractionService,
  createStorageService,
  type ApiClientConfig,
} from "@store-credit-platform/api-services";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, SECURE_STORE_KEYS } from "../config";

// Access-token getter/setter are injected by the auth store via `wireAccessToken`
// at store-creation time to break what would otherwise be a circular import.
let accessTokenGetter: () => string | null = () => null;
let accessTokenSetter: (token: string | null) => void = () => null;

export function wireAccessToken(
  getter: () => string | null,
  setter: (token: string | null) => void,
): void {
  accessTokenGetter = getter;
  accessTokenSetter = setter;
}

// Returns false on any failure so the api client falls through to a 401 and the
// store flips to `unauthenticated`.
async function refreshTokenHandler(): Promise<boolean> {
  const currentRefresh = await SecureStore.getItemAsync(
    SECURE_STORE_KEYS.REFRESH_TOKEN,
  );
  if (!currentRefresh) return false;
  try {
    const res = await customerAuthService.refresh(currentRefresh);
    if (res.success) {
      accessTokenSetter(res.data.access_token);
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.REFRESH_TOKEN,
        res.data.refresh_token,
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

const rnConfig: ApiClientConfig = {
  getAccessToken: () => accessTokenGetter(),
  setAccessToken: (t) => accessTokenSetter(t),
  refreshTokenHandler,
  baseUrl: API_BASE_URL,
  withCredentials: false,
};

export const customerAuthService = createCustomerAuthService(rnConfig);

export const customerCreditsService = createCustomerCreditsService(rnConfig);

export const customerActivitiesService = createCustomerActivitiesService(rnConfig);

export const customerRedemptionsService = createCustomerRedemptionsService(rnConfig);

export const customerProfileService = createCustomerProfileService(rnConfig);

export const customerBranchService = createCustomerBranchService(rnConfig);

export const customerConfigInteractionService =
  createCustomerConfigInteractionService(rnConfig);

export const storage = createStorageService(rnConfig);
