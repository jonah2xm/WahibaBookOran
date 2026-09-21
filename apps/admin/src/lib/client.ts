"use client";

/**
 * Browser calls to the admin API.
 *
 * Every screen now talks to a server that can be slow, down, or refuse. The
 * point of this file is that a failure arrives as a typed object with the
 * server's own message, so a screen can say "Le stock ne peut pas passer sous
 * zéro" instead of a generic "une erreur est survenue".
 */

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }

  /** True when the session died — the caller should send them to sign in. */
  get isAuth() {
    return this.status === 401;
  }

  /** The first field message, for a form that shows one line. */
  get firstField() {
    return this.fields ? Object.values(this.fields)[0] : undefined;
  }
}

async function request<T>(
  method: string,
  url: string,
  payload?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  } catch {
    // fetch only rejects when the request never completed: offline, DNS,
    // server down. Worth saying so rather than blaming the data.
    throw new ApiClientError(0, "offline", "Serveur injoignable.");
  }

  if (res.status === 204) return undefined as T;

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const error = (parsed as { error?: { code?: string; message?: string; fields?: Record<string, string> } })?.error;
    throw new ApiClientError(
      res.status,
      error?.code ?? "unknown",
      error?.message ?? `Erreur ${res.status}.`,
      error?.fields,
    );
  }

  return parsed as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  del: <T>(url: string) => request<T>("DELETE", url),
};

/** The message to show the user for any thrown value. */
export function messageFor(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.firstField ?? error.message;
  return fallback;
}
