import { accessTokenStorage } from "./accessTokenStorage.js";
import { RefreshTokenApiResponse } from "../types/api.types.js";

const WEB_API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export type APIResponse<T> = (T & { success: true }) | APIErrorResponse;

export type APIErrorResponse = {
  success: false;
  error: string;
};

interface RequestOptions extends RequestInit {
  body?: any;
}

export type ApiRequestFunction = <T>(
  endpoint: string,
  options?: RequestOptions,
) => Promise<T>;

/**
 * Injected configuration for a platform-agnostic API client.
 *
 * - `getAccessToken`: reads the current access token (web: in-memory module
 *   singleton; RN: zustand store).
 * - `setAccessToken`: writes a refreshed access token back to the source so
 *   subsequent requests pick it up.
 * - `refreshTokenHandler`: performs a refresh cycle and returns true on
 *   success. Web: POST /auth/refresh with browser cookies; RN: POST
 *   /customer-auth/refresh with the refresh token from SecureStore.
 * - `baseUrl`: API base URL (web: VITE_API_URL; RN: app.json extra.apiBaseUrl).
 * - `fetchImpl`: fetch implementation (defaults to global fetch; RN provides
 *   the same global, but the indirection makes the client testable).
 */
export interface ApiClientConfig {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  refreshTokenHandler: () => Promise<boolean>;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  /** Send credentials (cookies) with requests — web true, RN false. */
  withCredentials?: boolean;
}

// Guard against concurrent refresh attempts across multiple 401s (web only).
// RN builds create their own client with their own handler; the shared guard
// would serialize their refreshes too, which is fine.
let refreshPromise: Promise<boolean> | null = null;

async function webDoRefresh(): Promise<boolean> {
  try {
    const url = `${WEB_API_BASE_URL}/auth/refresh`;
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await response.json()) as RefreshTokenApiResponse;
    if (response.ok && data.success && data.data?.access_token) {
      accessTokenStorage.setAccessToken(data.data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = webDoRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Factory function to create API request functions.
 *
 * With no config: web defaults (in-memory `accessTokenStorage`, cookie-based
 * `refreshAccessToken`, `VITE_API_URL` base, `credentials: "include"`).
 * With a config: the injected transport — used by the React Native customer
 * app, which reads the access token from a zustand store and refreshes via
 * the `/customer-auth/refresh` endpoint with the refresh token from
 * `expo-secure-store`.
 */
export function createApiClient(config?: ApiClientConfig) {
  const getAccessToken = config?.getAccessToken ?? accessTokenStorage.getAccessToken;
  const refreshToken = config?.refreshTokenHandler ?? refreshAccessToken;
  const baseUrl = config?.baseUrl ?? WEB_API_BASE_URL;
  const fetchImpl = config?.fetchImpl ?? fetch;
  const credentials = config?.withCredentials === false ? undefined : "include";

  // Per-client refresh serialization so concurrent 401s on the RN side don't
  // fan out multiple refresh calls.
  let clientRefreshPromise: Promise<boolean> | null = null;
  async function serializedRefresh(): Promise<boolean> {
    if (clientRefreshPromise) return clientRefreshPromise;
    clientRefreshPromise = refreshToken();
    try {
      return await clientRefreshPromise;
    } finally {
      clientRefreshPromise = null;
    }
  }

  /**
   * Authenticated API request - requires valid custom JWT access token
   */
  async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const accessToken = getAccessToken();

    if (!accessToken) {
      throw new Error("No authentication token available");
    }

    const url = `${baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      ...(credentials ? { credentials } : {}),
    };

    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    let response = await fetchImpl(url, config);

    if (response.status === 401 && getAccessToken()) {
      const refreshed = await serializedRefresh();
      if (refreshed) {
        const retryConfig = { ...config };
        retryConfig.headers = {
          ...retryConfig.headers,
          Authorization: `Bearer ${getAccessToken()}`,
        };
        response = await fetchImpl(url, retryConfig);
      }
    }

    const data = (await response.json()) as APIResponse<T>;

    if (!response.ok) {
      throw new Error(
        (data as APIErrorResponse)?.error ||
          `API request failed with status ${response.status}`,
      );
    }

    return data as T;
  }

  /**
   * Public API request (no authentication required)
   */
  async function publicApiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      ...(credentials ? { credentials } : {}),
    };

    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetchImpl(url, config);
    const data = (await response.json()) as APIResponse<T>;

    if (!response.ok) {
      throw new Error(
        (data as APIErrorResponse)?.error ||
          `API request failed with status ${response.status}`,
      );
    }

    return data as T;
  }

  /**
   * Authenticated API request that returns a raw Blob (e.g. for PDF downloads)
   */
  async function apiBlobRequest(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<Blob> {
    const accessToken = getAccessToken();

    if (!accessToken) {
      throw new Error("No authentication token available");
    }

    const url = `${baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      ...(credentials ? { credentials } : {}),
    };

    let response = await fetchImpl(url, config);

    if (response.status === 401 && getAccessToken()) {
      const refreshed = await serializedRefresh();
      if (refreshed) {
        const retryConfig = { ...config };
        retryConfig.headers = {
          ...retryConfig.headers,
          Authorization: `Bearer ${getAccessToken()}`,
        };
        response = await fetchImpl(url, retryConfig);
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`,
      );
    }

    return response.blob();
  }

  return { apiRequest, publicApiRequest, apiBlobRequest };
}