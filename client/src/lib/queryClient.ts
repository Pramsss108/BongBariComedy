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
  const sessionId = localStorage.getItem('admin_session');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  
  // Add session token if available
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
  }
  
  // Add CSRF token for non-GET requests
  const method = options?.method?.toUpperCase();
  if (method && method !== 'GET' && method !== 'HEAD') {
    const token = getCSRFToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  
  const res = await fetch(url, {
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
    const sessionId = localStorage.getItem('admin_session');
    const headers: HeadersInit = {};
    if (sessionId) {
      headers.Authorization = `Bearer ${sessionId}`;
    }
    
    // Handle queryKey properly - if it's an array with one string, use that
    const url = Array.isArray(queryKey) && queryKey.length === 1 && typeof queryKey[0] === 'string' 
      ? queryKey[0] 
      : queryKey.join("/") as string;
    
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
