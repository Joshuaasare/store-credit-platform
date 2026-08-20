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

export interface ApiClientConfig {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  refreshTokenHandler: () => Promise<boolean>;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  withCredentials?: boolean;
}

// Guards against concurrent refresh attempts across multiple 401s.
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

export function createApiClient(config?: ApiClientConfig) {
  const getAccessToken = config?.getAccessToken ?? accessTokenStorage.getAccessToken;
  const refreshToken = config?.refreshTokenHandler ?? refreshAccessToken;
  const baseUrl = config?.baseUrl ?? WEB_API_BASE_URL;
  const fetchImpl = config?.fetchImpl ?? fetch;
  const credentials = config?.withCredentials === false ? undefined : "include";

  // Serializes refresh so concurrent 401s on the same client don't fan out.
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

  async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const accessToken = getAccessToken();

    if (!accessToken) {
      throw new Error("No authentication token available");
    }

    const url = `${baseUrl}${endpoint}`;
    // Declaring JSON content-type on an empty body makes Fastify reject
    // the request before the handler runs — silent no-op on DELETE.
    const hasJsonBody =
      options.body !== undefined &&
      options.body !== null &&
      (typeof options.body === "string"
        ? options.body.length > 0
        : typeof options.body === "object");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string> | undefined),
    };
    if (hasJsonBody && !("Content-Type" in headers)) {
      headers["Content-Type"] = "application/json";
    }

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

  async function publicApiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    // Same Fastify guard as apiRequest: don't send a JSON content-type with no body.
    const hasJsonBody =
      options.body !== undefined &&
      options.body !== null &&
      (typeof options.body === "string"
        ? options.body.length > 0
        : typeof options.body === "object");
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (hasJsonBody && !("Content-Type" in headers)) {
      headers["Content-Type"] = "application/json";
    }

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