import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getAuthService } from '../lib/firebase';
import type { Role } from '../shared/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: Role | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthService();
    let currentRequest = 0;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const request = ++currentRequest;
      setLoading(true);

      if (currentUser) {
        try {
          const claims = await currentUser.getIdTokenResult();
          if (request !== currentRequest) return;
          setUser(currentUser);
          setRole((claims.claims.role as Role) || null);
        } catch (error) {
          if (request !== currentRequest) return;
          console.error('Failed to load account role:', error);
          setUser(currentUser);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => {
      currentRequest++;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
