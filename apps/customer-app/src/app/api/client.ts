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

type CustomerRefreshResponse = Awaited<
  ReturnType<typeof customerAuthService.refresh>
>;

// Single shared refresh across every service client and the auth store's
// hydrate. Refresh rotates the token server-side, so two concurrent calls with
// the same stored token burn it: one wins, the other gets "Session expired"
// and its failure path used to wipe the winner's new token. All refreshes
// therefore share this one in-flight promise.
let refreshPromise: Promise<CustomerRefreshResponse | null> | null = null;

async function performRefresh(): Promise<CustomerRefreshResponse | null> {
  const currentRefresh = await SecureStore.getItemAsync(
    SECURE_STORE_KEYS.REFRESH_TOKEN,
  );
  if (!currentRefresh) return null;
  try {
    const res = await customerAuthService.refresh(currentRefresh);
    if (!res.success) return null;
    accessTokenSetter(res.data.access_token);
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.REFRESH_TOKEN,
      res.data.refresh_token,
    );
    return res;
  } catch {
    return null;
  }
}

export function refreshSession(): Promise<CustomerRefreshResponse | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Returns false on any failure so the api client falls through to a 401 and the
// store flips to `unauthenticated`.
async function refreshTokenHandler(): Promise<boolean> {
  return (await refreshSession()) != null;
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