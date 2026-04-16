import axios, { AxiosInstance, type AxiosRequestConfig } from "axios";
import { Platform } from "react-native";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiMeta = Record<string, unknown>;

export type ApiResponseShape<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
};

export class ApiHttpError extends Error {
  status: number | null;
  apiError?: ApiError;
  original?: unknown;

  constructor(
    message: string,
    status: number | null = null,
    apiError?: ApiError,
    original?: unknown,
  ) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.apiError = apiError;
    this.original = original;
  }
}

const DEFAULT_BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:4000"
    : (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000");

const instance: AxiosInstance = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 30_000,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Bypass-Tunnel-Reminder": "true", // Bypass localtunnel warning page
    "ngrok-skip-browser-warning": "true", // Bypass ngrok warning page
  },
});

let authToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorizedCallback(cb: () => void) {
  onUnauthorizedCallback = cb;
}

export async function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
}

export async function clearAuthToken() {
  authToken = null;
  delete instance.defaults.headers.common["Authorization"];
}

export async function getAuthToken(): Promise<string | null> {
  return authToken;
}

// Request interceptor ensures latest token is used and FormData Content-Type is correct
instance.interceptors.request.use(async (cfg) => {
  if (authToken) {
    cfg.headers = cfg.headers || {};
    cfg.headers["Authorization"] = `Bearer ${authToken}`;
  }
  // Khi gửi FormData, xóa Content-Type để browser tự thêm multipart/form-data + boundary
  if (cfg.data instanceof FormData) {
    // Xóa bằng nhiều cách để đảm bảo hoạt động với mọi phiên bản axios
    cfg.headers["Content-Type"] = undefined;
    if (cfg.headers && typeof cfg.headers.delete === "function") {
      cfg.headers.delete("Content-Type");
    }
  }
  return cfg;
});

// Response interceptor: unwrap server ApiResponse and normalize errors
instance.interceptors.response.use(
  (res) => {
    // Expecting server to use ApiResponseShape
    const payload = res.data as ApiResponseShape<unknown> | undefined;

    if (!payload) {
      return res;
    }

    if (payload.success) {
      // return the full response for callers who need meta, but default helpers return data
      return Object.assign(res, { data: payload });
    }

    const apiErr = payload.error;
    throw new ApiHttpError(
      apiErr?.message ?? payload.message ?? "Request failed",
      res.status ?? null,
      apiErr,
      payload,
    );
  },
  (err) => {
    // axios error wrapper
    const original = err;
    if (err.response) {
      const payload = err.response.data as
        | ApiResponseShape<unknown>
        | undefined;
      if (payload && payload.error) {
        if (err.response.status === 401 && payload.error.code === 'TOKEN_EXPIRED') {
          if (onUnauthorizedCallback) onUnauthorizedCallback();
        }
        throw new ApiHttpError(
          payload.error.message || payload.message || "Server error",
          err.response.status,
          payload.error,
          original,
        );
      }
      // Fallback for when response data is not in ApiResponseShape (e.g. HTML or string)
      let rawData = err.response.data;
      if (typeof rawData === "object") {
        rawData = JSON.stringify(rawData);
      }
      const requestUrl = err.config ? `${err.config.baseURL || ""}${err.config.url || ""}` : "unknown url";
      
      if (err.response.status === 401) {
         if (onUnauthorizedCallback) onUnauthorizedCallback();
      }

      throw new ApiHttpError(
        `HTTP ${err.response.status} at ${requestUrl}: ${err.response.statusText || "Error"} - ${String(rawData).substring(0, 100)}`,
        err.response.status,
        undefined,
        original,
      );
    }
    if (err.request) {
      throw new ApiHttpError(
        "No response received from server",
        null,
        undefined,
        original,
      );
    }
    throw new ApiHttpError(
      err.message || "Request setup error",
      null,
      undefined,
      original,
    );
  },
);

// Lightweight helpers that unwrap ApiResponseShape.data
export async function apiGet<T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
) {
  const res = await instance.get<ApiResponseShape<T>>(url, config);
  const payload = res.data as ApiResponseShape<T>;
  if (payload.success) return payload.data as T;
  throw new ApiHttpError(
    payload.error?.message || payload.message,
    null,
    payload.error,
    payload,
  );
}

export async function apiPost<T = unknown, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
) {
  const res = await instance.post<ApiResponseShape<T>>(url, body, config);
  const payload = res.data as ApiResponseShape<T>;
  if (payload.success) return payload.data as T;
  throw new ApiHttpError(
    payload.error?.message || payload.message,
    null,
    payload.error,
    payload,
  );
}

export { instance as apiClient };

export default {
  apiClient: instance,
  setAuthToken,
  setOnUnauthorizedCallback,
  apiGet,
  apiPost,
};
