"use client";

/**
 * Shared API client for server/client components
 */

const API_BASE = ""; // Same origin

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...fetchOptions } = options;

  const url = new URL(endpoint, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include", // Include cookies for Supabase auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};

// Specific API helpers
export const searchApi = {
  search: (q: string, options?: { type?: string; limit?: number; offset?: number }) =>
    api.get<{ results: any[]; pagination: any }>("/api/search", {
      q,
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.limit ? { limit: String(options.limit) } : {}),
      ...(options?.offset ? { offset: String(options.offset) } : {}),
    }),
};

export const progressApi = {
  update: (mediaId: string, data: { unit?: number; status?: string; score?: number; increment?: boolean }) =>
    api.patch<{ progress: any; media: any }>(`/api/progress/${mediaId}`, data),

  remove: (mediaId: string) =>
    api.delete(`/api/progress/${mediaId}`),
};

export const insightsApi = {
  update: (mediaId: string, content: string) =>
    api.patch<{ success: boolean }>(`/api/insights/${mediaId}`, { content }),
};

export const importApi = {
  import: (file: File, source: "letterboxd" | "anilist" | "mal" | "trakt") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", source);
    return fetch("/api/import", {
      method: "POST",
      body: formData,
      credentials: "include",
    }).then((r) => r.json());
  },
};

export const recommendationsApi = {
  getHorizons: (limit?: number) =>
    api.get<{ recommendations: any[] }>("/api/recommendations/horizons", { limit: String(limit || 10) }),
  getAll: (limit?: number) =>
    api.get<{ recommendations: any[] }>("/api/recommendations", { limit: String(limit || 10) }),
};

export const exportApi = {
  export: (format: "json" | "csv") =>
    api.get<{ downloadUrl: string }>("/api/export", { format }),
};