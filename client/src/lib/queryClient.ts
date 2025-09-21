import { QueryClient, QueryFunction } from "@tanstack/react-query";

// CSRF token management
let csrfToken: string | null = null;

export function setCSRFToken(token: string) {
  csrfToken = token;
  localStorage.setItem('csrf_token', token);
}

export function getCSRFToken(): string | null {
  if (!csrfToken) {
    csrfToken = localStorage.getItem('csrf_token');
  }
  return csrfToken;
}

export function clearCSRFToken() {
  csrfToken = null;
  localStorage.removeItem('csrf_token');
}

// API base management (supports Vite env and optional window override)
// Add multiple fallbacks so production build never silently calls relative path (causing 404 on GH Pages for POST /api/*)
function detectApiBase(): string {
  // 1. Vite injected env (dev + proper prod build)
  const envBase = (import.meta as any)?.env?.VITE_API_BASE;
  if (envBase) return envBase;
  // 2. Window override (can be injected via <script>)
  if (typeof window !== 'undefined' && (window as any).__API_BASE__) return (window as any).__API_BASE__;
  // 3. If running on GitHub Pages custom domain, use hardcoded production API host
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (/bongbari\.com$/i.test(host)) return 'https://bongbaricomedy.onrender.com';
  }
  return '';
}

// Allow late assignment (e.g., if 404.html lacked script but index injects later).
// We recompute if initially empty.
let API_BASE: string = detectApiBase();

function ensureApiBase(): string {
  if (!API_BASE) {
    API_BASE = detectApiBase();
  }
  return API_BASE;
}

export function buildApiUrl(url: string): string {
  if (!url) return url;
  // Absolute URLs pass through
  if (/^https?:\/\//i.test(url)) return url;
  const base = (ensureApiBase() || '').replace(/\/+$|^$/g, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return base ? `${base}${path}` : path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<any> {
  const finalUrl = buildApiUrl(url);
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('admin_session') : null;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
  }
  
  const method = options?.method?.toUpperCase();
  if (method && method !== 'GET' && method !== 'HEAD') {
    const token = getCSRFToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  
  const res = await fetch(finalUrl, {
    credentials: "include",
    ...options,
    headers,
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('admin_session') : null;
    const headers: HeadersInit = {};
    if (sessionId) {
      (headers as any).Authorization = `Bearer ${sessionId}`;
    }
    
    const url = Array.isArray(queryKey) && queryKey.length === 1 && typeof queryKey[0] === 'string' 
      ? queryKey[0] 
      : (queryKey as any).join("/") as string;
    const finalUrl = buildApiUrl(url);
    const res = await fetch(finalUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
