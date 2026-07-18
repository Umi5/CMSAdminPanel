const BASE = "/api";

/** Thrown for any non-2xx response. `details` carries the server's error payload
 *  (e.g. a migration plan on a 409), so callers can react to it. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readError(data: unknown): { message?: string; details?: unknown } {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (err && typeof err === "object")
      return err as { message?: string; details?: unknown };
  }
  return {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const { message, details } = readError(data);
    throw new ApiError(
      res.status,
      message ?? res.statusText ?? "Request failed",
      details,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>("GET", path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>("PUT", path, body),
  delete: <T>(path: string): Promise<T> => request<T>("DELETE", path),
};
