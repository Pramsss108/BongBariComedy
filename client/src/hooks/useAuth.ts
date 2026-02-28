import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Synchronize React state with Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get the Real JWT token to access God Tier
          const token = await firebaseUser.getIdToken();
          setSessionId(token);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Bong Bari Member',
            photoURL: firebaseUser.photoURL,
          });
        } catch (err) {
          console.error("Error retrieving Firebase token:", err);
          setUser(null);
          setSessionId(null);
        }
      } else {
        setUser(null);
        setSessionId(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      queryClient.clear();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !!sessionId,
    logout,
    sessionId
  };
}