import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, clearCSRFToken } from "@/lib/queryClient";

interface AuthUser {
  username: string;
}

export function useAuth() {
  const [sessionId, setSessionId] = useState<string | null>(
    localStorage.getItem('admin_session') || localStorage.getItem('admin_jwt')
  );
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
  queryFn: () => apiRequest('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${sessionId}`
      }
    }),
    enabled: !!sessionId,
    retry: false
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      localStorage.removeItem('admin_session');
      localStorage.removeItem('admin_jwt');
      setSessionId(null);
      clearCSRFToken(); // Clear CSRF token on logout
      queryClient.clear();
    }
  });

  const setSession = (newSessionId: string) => {
  // Support both legacy session and new JWT
  localStorage.setItem('admin_session', newSessionId);
  localStorage.setItem('admin_jwt', newSessionId);
    setSessionId(newSessionId);
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  // Clear session on auth error
  useEffect(() => {
    if (error && sessionId) {
      localStorage.removeItem('admin_session');
  localStorage.removeItem('admin_jwt');
      setSessionId(null);
      clearCSRFToken(); // Clear CSRF token on auth error
    }
  }, [error, sessionId]);

  return {
    user: user as AuthUser | undefined,
    isLoading,
    isAuthenticated: !!user && !!sessionId,
    setSession,
    logout,
    sessionId
  };
}