import { accessTokenStorage } from "./accessTokenStorage.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export type APIResponse<T> = (T & { success: true }) | APIErrorResponse;

// Guard against concurrent refresh attempts across multiple 401s
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}/auth/refresh`;
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await response.json()) as APIResponse<{
      access_token: string;
    }>;
    if (response.ok && data.success && "data" in data && data.access_token) {
      accessTokenStorage.setAccessToken(data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

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
 * Factory function to create API request functions
 */
export function createApiClient() {
  /**
   * Authenticated API request - requires valid custom JWT access token
   */
  async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const accessToken = accessTokenStorage.getAccessToken();

    if (!accessToken) {
      throw new Error("No authentication token available");
    }

    // Prepare request
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    // Convert body to JSON if it's an object
    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    // Make request
    let response = await fetch(url, config);

    // If 401 and we had a token, try silent refresh once and retry
    if (response.status === 401 && accessTokenStorage.getAccessToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryConfig = { ...config };
        retryConfig.headers = {
          ...retryConfig.headers,
          Authorization: `Bearer ${accessTokenStorage.getAccessToken()}`,
        };
        response = await fetch(url, retryConfig);
      }
    }

    // Parse response
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
   * Use this for endpoints like OTP send, login, etc.
   */
  async function publicApiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    // Convert body to JSON if it's an object
    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    // Make request
    const response = await fetch(url, config);

    // Parse response
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
    const accessToken = accessTokenStorage.getAccessToken();

    if (!accessToken) {
      throw new Error("No authentication token available");
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    const config: RequestInit = { ...options, headers, credentials: "include" };

    let response = await fetch(url, config);

    // If 401 and we had a token, try silent refresh once and retry
    if (response.status === 401 && accessTokenStorage.getAccessToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryConfig = { ...config };
        retryConfig.headers = {
          ...retryConfig.headers,
          Authorization: `Bearer ${accessTokenStorage.getAccessToken()}`,
        };
        response = await fetch(url, retryConfig);
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
