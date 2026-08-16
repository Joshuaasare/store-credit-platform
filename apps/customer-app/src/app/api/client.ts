import {
  createCustomerAuthService,
  createCustomerCreditsService,
  createCustomerActivitiesService,
  createCustomerRedemptionsService,
  type ApiClientConfig,
} from "@store-credit-platform/api-services";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, SECURE_STORE_KEYS } from "../config";

/**
 * Platform-specific API client wiring for the customer app.
 *
 * The access-token getter/setter are injected by the auth store via
 * `wireAccessToken` at store-creation time. This breaks what would otherwise
 * be a circular import (store imports the service to call endpoints; the
 * service config imports the store to read the access token). The wiring
 * runs once before any request fires.
 */
let accessTokenGetter: () => string | null = () => null;
let accessTokenSetter: (token: string | null) => void = () => null;

export function wireAccessToken(
  getter: () => string | null,
  setter: (token: string | null) => void,
): void {
  accessTokenGetter = getter;
  accessTokenSetter = setter;
}

/**
 * Refresh handler: read the refresh token from SecureStore, POST
 * /customer-auth/refresh, persist the rotated refresh token, and push the
 * new access token into the auth store. Returns false on any failure so the
 * api client falls through to a 401 (which the caller surfaces as auth
 * failure → the store flips to `unauthenticated`).
 */
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
  withCredentials: false, // RN has no httpOnly cookies.
};

export const customerAuthService = createCustomerAuthService(rnConfig);

/**
 * Customer-app credits service. Shares the same RN-injected transport
 * (access-token getter/setter + refresh handler) as the auth service, so
 * authenticated requests automatically attach the customer JWT and trigger
 * a refresh cycle on 401.
 */
export const customerCreditsService = createCustomerCreditsService(rnConfig);

/**
 * Customer-app activities service. Backs the Home tab's Recent Activity
 * feed (issuances + approved redemptions, cursor-paginated). Shares the
 * same RN-injected transport as the other customer services.
 */
export const customerActivitiesService = createCustomerActivitiesService(rnConfig);

/**
 * Customer-app redemptions service. Backs the "Credits Redeemed" tab on
 * the merchant detail screen (pending + approved + rejected redemptions
 * at a single merchant, plus soft-cancel). Shares the same RN-injected
 * transport as the other customer services.
 */
export const customerRedemptionsService = createCustomerRedemptionsService(rnConfig);
