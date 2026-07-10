import { accessTokenStorage } from "./accessTokenStorage.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

    const response = await fetch(url, config);

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
