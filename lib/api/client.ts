export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Retrieve token from localStorage if in browser
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("one_erp_token");
  }

  const isFormData =
    typeof FormData !== "undefined" && customConfig.body instanceof FormData;

  const defaultHeaders: Record<string, string> = isFormData
    ? { Accept: "application/json" }
    : { "Content-Type": "application/json", Accept: "application/json" };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // A lapsed trial/subscription blocks every tenant business-data
    // endpoint (see backend middleware.RequireActiveLicense) with a 402.
    // Redirect to billing globally here rather than in every page that
    // calls apiClient, so an expired customer always lands somewhere they
    // can actually act on instead of a broken/half-loaded page.
    if (
      response.status === 402 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/billing")
    ) {
      window.location.href = "/billing/subscription";
    }

    const err = new Error(data.error?.message || data.message || "An unexpected error occurred") as Error & {
      status?: number;
      details?: unknown;
    };
    err.status = response.status;
    err.details = data.error?.details;
    throw err;
  }

  return data;
}

/**
 * Like apiClient, but for endpoints that may respond with either raw binary
 * (a real file, Content-Type not application/json) or the usual JSON
 * envelope (e.g. legacy metadata-only download). Returns a Blob plus the
 * filename from Content-Disposition when the response is binary, or the
 * parsed ApiResponse otherwise.
 */
export async function apiClientDownload<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ blob: Blob; filename: string | null } | ApiResponse<T>> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("one_erp_token");
  }

  const defaultHeaders: Record<string, string> = {};
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  const contentType = response.headers.get("Content-Type") || "";

  if (!response.ok) {
    let message = "An unexpected error occurred";
    try {
      const data = await response.json();
      message = data.error?.message || data.message || message;
    } catch {
      // ignore parse failure, use default message
    }
    throw new Error(message);
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiResponse<T>;
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : null;

  return { blob: await response.blob(), filename };
}
