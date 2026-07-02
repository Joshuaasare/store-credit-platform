import { SupabaseClient } from "@supabase/supabase-js";

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
 * Factory function to create API request functions configured with a Supabase client
 * This allows the same service functions to work with different Supabase clients
 * (web browser client, Expo client, server-side client, etc.)
 */
export function createApiClient(
  supabaseClient: SupabaseClient<any, "public", "public", any, any>,
) {
  /**
   * Authenticated API request - requires valid session
   */
  async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    // Prepare request
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
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
   * Use this for endpoints like password reset, OTP, login, etc.
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
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const config: RequestInit = { ...options, headers };

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
