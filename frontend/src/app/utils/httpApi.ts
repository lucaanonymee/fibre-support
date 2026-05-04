export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const RAW_API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').trim();
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

export const invalidateCsrfTokenCache = () => {
  csrfTokenCache = null;
  csrfTokenPromise = null;
};

export const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
};

const parseJsonSafely = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const extractErrorMessage = (payload: any, status: number): string => {
  if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
    return payload.message;
  }

  return `Requete echouee (${status})`;
};

const isCsrfFailure = (status: number, payload: any): boolean => {
  if (status !== 403) {
    return false;
  }

  const message = typeof payload?.message === 'string' ? payload.message : '';
  return /csrf/i.test(message);
};

export const ensureCsrfToken = async (force = false): Promise<string> => {
  if (!force && csrfTokenCache) {
    return csrfTokenCache;
  }

  if (!csrfTokenPromise || force) {
    csrfTokenPromise = (async () => {
      const response = await fetch(buildApiUrl('/api/csrf-token'), {
        method: 'GET',
        credentials: 'include',
      });

      const payload = await parseJsonSafely(response);

      if (!response.ok) {
        throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
      }

      if (!payload?.csrfToken || typeof payload.csrfToken !== 'string') {
        throw new ApiError('Token CSRF introuvable dans la reponse', 500, payload);
      }

      csrfTokenCache = payload.csrfToken;
      return csrfTokenCache;
    })().finally(() => {
      csrfTokenPromise = null;
    });
  }

  return csrfTokenPromise;
};

interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export async function apiRequest<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const isUnsafe = UNSAFE_METHODS.has(method);
  const isFormData = options.body instanceof FormData;

  const executeRequest = async (forceCsrfRefresh = false) => {
    const headers: Record<string, string> = {
      ...(options.headers ?? {}),
    };

    if (isUnsafe) {
      const csrfToken = await ensureCsrfToken(forceCsrfRefresh);
      headers['x-csrf-token'] = csrfToken;
    }

    if (options.body != null && !isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: options.body == null ? undefined : isFormData ? (options.body as FormData) : JSON.stringify(options.body),
      credentials: 'include',
    });

    const payload = await parseJsonSafely(response);
    return { response, payload };
  };

  let { response, payload } = await executeRequest(false);

  // Transparently recover from stale CSRF cache after logout/session changes.
  if (isUnsafe && isCsrfFailure(response.status, payload)) {
    invalidateCsrfTokenCache();
    ({ response, payload } = await executeRequest(true));
  }

  if (!response.ok) {
    if (isUnsafe && response.status === 403) {
      invalidateCsrfTokenCache();
    }

    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}

export const getErrorMessage = (error: unknown, fallback = 'Une erreur est survenue'): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
